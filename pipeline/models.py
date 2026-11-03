#!/usr/bin/env python3
"""
FireLens Neural Network Architectures (Task A6 & A7)
Multi-task Dual-Head U-Net for Active Fire (AF), Burned Area (BA),
and Next-Day Fire Spread Prediction.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class DoubleConv(nn.Module):
    """(Conv2D -> BatchNorm -> LeakyReLU) * 2"""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.1, inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class Down(nn.Module):
    """Downscaling with MaxPool then DoubleConv"""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.MaxPool2d(2),
            DoubleConv(in_channels, out_channels),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class Up(nn.Module):
    """Upscaling then DoubleConv with skip connection"""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_channels, in_channels // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_channels, out_channels)

    def forward(self, x1: torch.Tensor, x2: torch.Tensor) -> torch.Tensor:
        x1 = self.up(x1)
        # Pad x1 if shapes don't match exactly due to odd spatial dims
        diffY = x2.size()[2] - x1.size()[2]
        diffX = x2.size()[3] - x1.size()[3]
        x1 = F.pad(x1, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        x = torch.cat([x2, x1], dim=1)
        return self.conv(x)


class FireLensUNet(nn.Module):
    """
    Multi-Task U-Net for Wildfire Modeling:
    Inputs: (B, C_in, H, W)
      - For AF/BA: C_in = 16 (2-day window x 8 channels)
    Outputs:
      - af_logits: (B, 1, H, W)
      - ba_logits: (B, 1, H, W)
      - pred_logits: (B, 1, H, W) (Next-day fire spread probability)
    """

    def __init__(self, in_channels: int = 16, base_filters: int = 32):
        super().__init__()
        self.in_conv = DoubleConv(in_channels, base_filters)
        self.down1 = Down(base_filters, base_filters * 2)       # 32 -> 64
        self.down2 = Down(base_filters * 2, base_filters * 4)   # 64 -> 128
        self.down3 = Down(base_filters * 4, base_filters * 8)   # 128 -> 256

        self.up1 = Up(base_filters * 8, base_filters * 4)       # 256 -> 128
        self.up2 = Up(base_filters * 4, base_filters * 2)       # 128 -> 64
        self.up3 = Up(base_filters * 2, base_filters)           # 64 -> 32

        # Task-specific prediction heads
        self.head_af = nn.Conv2d(base_filters, 1, kernel_size=1)
        self.head_ba = nn.Conv2d(base_filters, 1, kernel_size=1)
        self.head_pred = nn.Conv2d(base_filters, 1, kernel_size=1)

    def forward(self, x: torch.Tensor):
        x1 = self.in_conv(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)

        d = self.up1(x4, x3)
        d = self.up2(d, x2)
        feat = self.up3(d, x1)

        af_logits = self.head_af(feat)
        ba_logits = self.head_ba(feat)
        pred_logits = self.head_pred(feat)

        return af_logits, ba_logits, pred_logits


class DiceBCELoss(nn.Module):
    """
    Weighted BCE + Soft Dice Loss for severe class imbalance.
    Optimizes directly for F1/Dice score.
    """

    def __init__(self, pos_weight: float = 10.0, dice_weight: float = 1.0, eps: float = 1e-6):
        super().__init__()
        self.pos_weight = pos_weight
        self.dice_weight = dice_weight
        self.eps = eps

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # BCE with positive weighting
        weight = torch.tensor([self.pos_weight], device=logits.device)
        bce = F.binary_cross_entropy_with_logits(logits, targets, pos_weight=weight)

        # Soft Dice
        probs = torch.sigmoid(logits)
        probs_flat = probs.view(-1)
        targets_flat = targets.view(-1)

        intersection = (probs_flat * targets_flat).sum()
        dice = (2.0 * intersection + self.eps) / (probs_flat.sum() + targets_flat.sum() + self.eps)
        dice_loss = 1.0 - dice

        return bce + self.dice_weight * dice_loss
