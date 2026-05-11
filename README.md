# MatrixCode Console 🔲

[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **🤖 AI-Crafted Project / AI 铸造项目:** > 本项目的全部核心逻辑、算法重构与界面设计，均由 **Google Gemini** 完整开发与优化，创意来源于 **relicx**。
> The entire core logic, algorithm optimization, and UI design of this project were completely developed by **Google Gemini**, based on the original idea by **relicx**.

[中文版 (Chinese)](#中文介绍) | [English Version](#english-introduction)

---

## 中文介绍

MatrixCode 控制台是一个基于纯前端运行的高级矩阵编码与解码工具。它支持高密度的信息封装，内置了强大的纠错引擎与图像识别系统，完全在您的本地浏览器中运行，无需任何后端服务器交互。

### ✨ 核心特性

* **🎨 复合编码模式 (Base-121 & Monochrome)**
  支持传统的黑白拓扑编码，以及全新的彩色 Base-121 模式。彩色模式通过多维度调色板极大地提升了单个网格的数据承载密度。
* **🛡️ 强大的 RS 容错机制 (Reed-Solomon ECC)**
  系统内置了底层数学优化的 Reed-Solomon 纠错引擎。即使生成的矩阵图像遭受一定程度的物理污损或遮挡，依然可以通过自适应的冗余率（10% - 30%）暴力破解并恢复原始数据。
* **📸 工业级视觉解码器 (Industrial Vision Engine)**
  解码器无需您手动输入复杂的参数。它支持 8 自由度 (8-DOF) 透视校正，并能自动扫描、推断网格尺寸 (Grid Size) 与色彩映射，无论是从生成器直接提取还是上传实拍照片，均能精准解析。
* **🚀 纯本地与静态架构 (Local-first & Pure Frontend)**
  开箱即用，零后端依赖。所有文本的加密、编码及图像解析过程均在本地浏览器内存中实时计算，绝不向外部服务器传输任何数据。

### 🚀 部署与运行指引

本项目为纯静态 Web 应用，没有任何复杂的构建步骤。

1. **直接运行 (最简单)**：下载项目后，直接双击打开 `index.html` (或 `matrix.html`) 即可在浏览器中使用，完全离线可用。
2. **本地服务运行**：您也可以使用 VS Code 的 `Live Server` 插件，或者通过 Python (`python -m http.server`) 启动本地环境运行。
3. **云端托管**：由于是纯静态文件，您可以将本项目零成本部署至 GitHub Pages, Vercel 或 Cloudflare Pages。

---
---

## English Introduction

MatrixCode Console is an advanced, pure frontend-based matrix encoding and decoding tool. It supports high-density information encapsulation with a powerful built-in error correction engine and image recognition system, running entirely in your local browser with no backend server interaction.

### ✨ Core Features

* **🎨 Composite Encoding (Base-121 & Monochrome)**
  Supports traditional black-and-white topological encoding, as well as an innovative Color Base-121 mode. The color mode dramatically increases data density per grid utilizing a multi-dimensional palette.
* **🛡️ Robust RS Error Correction (Reed-Solomon ECC)**
  Features a mathematically optimized Reed-Solomon error correction engine. Even if the generated matrix image suffers from physical damage or partial occlusion, the system can brute-force and recover the original data using an adaptive redundancy rate (10% - 30%).
* **📸 Industrial-Grade Vision Decoder**
  The decoder requires zero manual parameter input. It supports 8-DOF perspective correction and automatically scans and infers the grid size and color mapping. It parses accurately whether extracting directly from the generator or uploading a real-world photograph.
* **🚀 Local-first & Pure Frontend Architecture**
  Ready to use out-of-the-box with zero backend dependencies. All text encryption, encoding, and image parsing processes are computed in real-time within your local browser's memory. No data is ever transmitted to external servers.

### 🚀 Deployment & Running Guide

This project is a pure static Web application with no build steps required.

1. **Direct Run (Easiest)**: Download the project and simply double-click `index.html` (or `matrix.html`) to open it directly in your browser. It works completely offline.
2. **Run via Local Server**: You can also use the `Live Server` extension in VS Code, or start a local environment using Python (`python -m http.server`).
3. **Cloud Web Hosting**: As pure static files, you can deploy this project at zero cost to GitHub Pages, Vercel, or Cloudflare Pages.

---
---

## ⚖️ 免责声明 (Disclaimer)

Please read this disclaimer carefully before using this software. 
请在使用本软件前仔细阅读以下条款。

### No Warranty & Limitation of Liability (核心免责声明)
**THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.** **本软件按“原样”提供，不提供任何明示或暗示的担保。**

* **Data Integrity (数据完整性):** MatrixCode relies on browser-based Canvas and mathematical algorithms. While it includes ECC, the developers are not responsible for any data loss caused by extreme image corruption, browser incompatibility, or mathematical limitations.
  开发作者对由于图像过度损毁、浏览器兼容性问题或算法极限导致的解码失败与数据丢失不承担任何责任。
* **No Commercial Support (无商业支持):** This project is a technical exploration shared as open source. The developers make no commitment to provide technical support, updates, or bug fixes.
  本项目为技术探索开源分享，不承诺提供持续技术支持或更新。