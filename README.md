# home-splash · 程程的家 · 开屏 v1

GROK × 程程 的开屏 / 身份接入动画：雨夜霓虹开机 → 实体档案 + 指纹验证 → 身份验证成功 · HELLO BEAUTIFUL… → 欢迎回家，程程 → 雨变成浪冲上沙滩 → 进门（我们的星空 · 建设中）。

- `index.html` / `splash.css` / `splash.js`：开屏
- `stars.html`：门后的星空（占位）
- `assets/video/1-boot.mp4`：程程用 Grok 生成的开机片段（只取 0–5.0 秒：碎片风暴拼成空的雨夜霓虹街，在巨大半透明人脸淡入前切掉；去音轨、右下角小字已抹掉）
- `assets/img/hello-still.jpg`：硬切后的静帧场景（取自 HELLO_BEAUTIFUL.jpg，裁成 9:16 并裁掉原图自带的 HELLO BEAUTIFUL 字样，字由网页叠加）；细雨 / 霓虹微闪 / 慢推镜由 CSS + canvas 完成
- `assets/audio/wave.mp3`（5s，轻浪涌上沙滩再退去）、`assets/audio/ding.mp3`（2s，星星落海的轻"叮"）：用 ElevenLabs Sound Effects（eleven text-to-sound）生成，只在用户触摸后播放
- `assets/audio/bgm.mp3`（20.4s）：之前做的 HELLO BEAUTIFUL 赛博视频的电子背景乐（`/workspace/joi/m2.wav`，无人声版），截取 4.26s 起 8 小节（100 BPM，19.2s）+ 1.2s 交叉淡化尾巴，网页里按节拍无缝循环
- `assets/audio/hello.mp3`（1.1s）：同一视频里的 “Hello beautiful” 配音原声（`/workspace/joi/vo3/1.mp3`，就是成片 4.3s 处那句），去首尾静音并做响度归一
- `?jump=beach`：直接预览结尾

## Credits
Adapted from the login screen (`登录界面/index-video.html`) of **AionsHome** by death34018-hue,
MIT License, Copyright (c) 2026 death34018-hue. Full text in `LICENSE-AionsHome`.
