# 莜仁播放器 (Yuujin Player)

极简 纯粹



## 特性

- **多格式支持**：播放多种音频格式，包括MP3、WAV和MIDI文件。
- **直观的音乐库管理**：轻松添加单曲或整个文件夹到您的音乐库。
- **动态播放列表**：即时创建和管理您的播放列表。
- **歌词显示**：导入并显示同步歌词，支持翻译歌词。
- **可视化音频波形**：实时显示当前播放曲目的波形。
- **均衡器**：通过10段均衡器微调您的听觉体验。
- **深色模式**：在明暗主题间切换，适应各种环境。
- **响应式设计**：在桌面和移动设备上享受无缝体验。
- **国际化**：支持多种语言，包括英语、中文和日语。
- **性能模式**：为低端设备优化播放器或节省资源。

## 使用的技术

- **Vue.js**：用于构建用户界面的前端JavaScript框架。
- **Tailwind CSS**：用于快速UI开发的实用优先CSS框架。
- **jsmediatags**：用于读取音频文件ID3标签的库。
- **ApexCharts**：用于创建音频波形可视化的图表库。
- **Feather Icons**：简洁美观的开源图标。
- **GSAP (GreenSock动画平台)**：用于平滑过渡和效果的动画库。
- **MIDI.js**：用于MIDI文件播放和操作的库。
- **Web Audio API**：用于高级音频处理和均衡器功能。

## 快速开始

### 前置要求

- Node.js (v14.0.0 或更高版本)
- npm (v6.0.0 或更高版本)

### 安装

1. 克隆仓库：
   ```
   git clone https://github.com/你的用户名/yuujin-player.git
   ```

2. 进入项目目录：
   ```
   cd yuujin-player
   ```

3. 安装依赖：
   ```
   npm install
   ```

4. 启动开发服务器：
   ```
   npm run serve
   ```

5. 打开浏览器访问 `http://localhost:8080` 即可看到运行中的应用。

## 使用说明

1. **添加音乐**：点击"添加歌曲"或"添加文件夹"来导入您的音乐文件。
2. **播放控制**：使用播放、暂停、下一首和上一首按钮控制播放。
3. **歌词**：导入歌词文件（.lrc格式）以显示同步歌词。
4. **均衡器**：在设置中调整均衡器滑块以自定义声音。
5. **语言**：在设置菜单中更改应用程序语言。

## 贡献

欢迎贡献！请随时提交Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m '添加一些惊人的特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [jsmediatags](https://github.com/aadsm/jsmediatags)
- [ApexCharts](https://apexcharts.com/)
- [Feather Icons](https://feathericons.com/)
- [GSAP](https://greensock.com/gsap/)
- [MIDI.js](https://github.com/mudcube/MIDI.js/)
