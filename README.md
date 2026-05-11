# MatrixCode Console 🔲

[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🔥 **[Live Demo / 在线体验尝试点这里](https://matrixcode.allinagistudio.com/)** 🔥

> **🤖 AI-Crafted Project / AI 铸造项目:** > 本项目的全部核心逻辑、算法重构与界面设计，均由 **Google Gemini** 完整开发与优化，创意来源于 **relicx**。
> The entire core logic, algorithm optimization, and UI design of this project were completely developed by **Google Gemini**, based on the original idea by **relicx**.

[中文版 (Chinese)](#中文介绍) | [English Version](#english-introduction)

---

## 中文介绍

MatrixCode 控制台是一个基于纯前端运行的高密度矩阵编解码实验性工具。它探索了在现代显示设备环境下，如何通过复合编码（形状+色彩）突破传统二维条码的容量瓶颈。

### ⚠️ 工程声明 (Engineering Statement)

MatrixCode 是一项高度依赖 **Screen-to-Camera (屏幕对镜头)** 传输的方案。
* **优势**：在优质显示环境下，物理信息密度提升至 **6.4 Bits/Cell**，大幅领先于传统二维码（1 Bit/Cell）。
* **局限**：对打印介质（纸张）不友好；对极端环境光（如强烈的暖色调光或反光）导致的白平衡偏移较为敏感。

### ✨ 核心特性

* **🎨 复合编码模式 (Base-121 & Monochrome)**
  支持传统的黑白拓扑编码，以及基于 8 色彩维度 + 15 形状维度的彩色 Base-121 模式。采用 5 网格映射 4 字节的进制压缩算法，实现极高的空间复用。
* **🛡️ 数学驱动的纠错机制 (Reed-Solomon ECC)**
  内置基于伽罗瓦域（GF256）优化的 Reed-Solomon 纠错引擎。支持 10% - 30% 的自适应冗余率推断，并引入 Adler-32 校验和，从数学层面杜绝“幽灵解码”。
* **📸 高鲁棒性视觉解析器 (Robust Vision Parser)**
  原生 JS 实现的视觉引擎。支持 8 自由度（8-DOF）透视校正矩阵运算，具备拓扑射线搜索（Ray-Casting）能力，可自动推断网格尺寸并进行亚像素级色彩投票采样。
* **🚀 纯本地架构 (Local-first & Pure Frontend)**
  零依赖，纯内存计算。数据编解码过程完全脱离网络，为物理隔离环境下的敏感数据交换提供底层支持。

### 💡 典型应用场景：硬件冷钱包签名 (代替动画二维码)

* **现实痛点**：为了实现绝对的物理隔离（Air-Gapped），硬件钱包通常禁用了所有无线通信。当处理复杂的智能合约交易时，由于单张二维码容量不足，设备需循环播放“动画二维码”（Animated QR），手机录制时易受环境光干扰导致丢帧，体验极不稳定。
* **MatrixCode 方案**：MatrixCode 提供了一种静态高密度替代方案。彩色模式可将 1~2KB 的交易数据封装进单帧静态图像中，手机摄像头单次捕捉即可完成解析，规避了时序同步带来的丢帧风险。

### 🚀 部署与运行指引

1. **直接运行 (Easiest)**：下载项目后，直接双击打开 `index.html` 即可，完全支持离线使用。
2. **本地服务运行**：使用 VS Code 的 `Live Server` 或 Python (`python -m http.server`) 启动。
3. **云端托管**：纯静态架构，可直接部署至 GitHub Pages 或 Cloudflare Pages。

---
---

## English Introduction

MatrixCode Console is an experimental, pure frontend tool for high-density matrix encoding and decoding. It explores pushing the capacity limits of 2D barcodes in modern display environments using composite encoding (shape + color).

### ⚠️ Engineering Statement

MatrixCode is a specialized **Screen-to-Camera** transmission solution.
* **Pros**: In high-quality display environments, physical information density reaches **6.4 Bits/Cell**, significantly exceeding traditional QR codes (1 Bit/Cell).
* **Cons**: Unsuited for printed media; sensitive to white balance shifts caused by extreme ambient lighting (e.g., intense warm lights or glare).

### ✨ Core Features

* **🎨 Composite Encoding (Base-121 & Monochrome)**
  Supports traditional black-and-white topological encoding and a Color Base-121 mode (8 colors × 15 shapes). Uses a 5-cell to 4-byte radix conversion algorithm for maximum spatial efficiency.
* **🛡️ Math-Driven Error Correction (Reed-Solomon ECC)**
  Features a built-in RS engine optimized over Galois Field (GF256). Supports 10%-30% adaptive redundancy inference and incorporates Adler-32 checksums to eliminate "phantom decoding" at the mathematical level.
* **📸 Robust Vision Parser**
  A native JS vision engine supporting 8-DOF perspective correction and topological ray-casting. It automatically infers grid size and performs sub-pixel color-vote sampling.
* **🚀 Local-first Architecture**
  Zero-dependency, memory-only computation. The entire process is offline, providing a foundation for sensitive data exchange in air-gapped environments.

### 💡 Highlight Use Case: Cold Wallet Signatures (Static Alternative to Animated QR)

* **The Problem**: To maintain air-gapped security, hardware wallets lack wireless connectivity. For large smart contract transactions, devices must use "Animated QR codes" (slideshows). These often fail during mobile recording due to dropped frames caused by lighting changes.
* **The Solution**: MatrixCode provides a high-density static alternative. The Color Base-121 mode can pack 1~2KB of transaction data into a single frame. A single camera capture completes the transfer, eliminating the synchronization issues inherent in animated sequences.

### 🚀 Deployment & Running Guide

1. **Direct Run**: Open `index.html` directly in any browser. Fully functional offline.
2. **Local Server**: Use VS Code `Live Server` or Python (`python -m http.server`).
3. **Cloud Hosting**: Deploy at zero cost to GitHub Pages or Cloudflare Pages.

---
---

## ⚖️ 免责声明 (Disclaimer)

* **Data Integrity**: MatrixCode relies on experimental algorithms. While ECC is included, the developers are not responsible for data loss caused by extreme image distortion or hardware limitations.
* **No Commercial Support**: This project is a technical exploration shared as open source. No commitment is made for ongoing updates or security patches.