Porta Portable - Quick Start
===========================

Run (no Node.js install required)
  1. Double-click "Start-Porta.bat"
  2. Wait until "Porta is ready" message appears
  3. Browser opens at http://localhost:3847
  4. Put CSV files in inbox/ subfolders (see below)

Inbox — CSV without browser upload
  inbox/grr/              GRR analysis CSV
  inbox/liw/              LIW analysis CSV
  inbox/temperature/      Temperature Tracking CSV
  inbox/tact-time/Station1~8/  Tact Time CSV (per station)
  inbox/error-analysis/   Error Analysis CSV
  inbox/config/           GRR Config CSV

  1. Copy CSV into the matching inbox folder (Windows Explorer)
  2. Open the matching Porta page
  3. Click [최신 파일 불러오기] in the Inbox panel

If the page looks broken (plain text, no layout)
  - Wait for the server ready message, then press Ctrl+Shift+R (hard refresh)
  - Do not open the browser before the server is ready

Stop
  Close the "Porta Server" terminal window.

Troubleshooting
  Server already running
    - Start-Porta.bat again opens the browser only (no restart).
    - To restart: close "Porta Server" window first, then run Start-Porta.bat.

  "app was unexpected at this time"
    - Folder path contains parentheses (), e.g. Program(20260703).
    - Use the latest Start-Porta.bat / Run-Server.bat, or move to C:\Porta\ etc.

  Port already in use
    - Close the other "Porta Server" window, or change PORT=3847 in Start-Porta.bat.

Folder layout
  Porta-portable/
    Start-Porta.bat
    inbox/        CSV drop folders (see inbox/README.txt)
    app/          program
    node/         bundled Node.js runtime
    README.txt

Port conflict
  Change PORT=3847 in Start-Porta.bat to another port if needed.

Config
  Edit app/public/GaiaStat2grrConfig.csv and restart,
  or upload Config CSV in the UI.

Tact Time 기본 세팅
  app/public/tact-time-default-stations.json
  - 최초 실행 시 localStorage가 비어 있으면 이 파일을 자동 로드
  - 개발 PC에서 세팅 변경 후: Tact Time Setting → [배포용 기본값 저장]
    또는 npm run export:tact-time-default
  - build:portable 시 public/ 폴더와 함께 portable에 포함됨

Rebuild package (dev PC only)
  cd gaia-web
  npm run build:portable

배포 방법
  Porta-portable 폴더 전체를 ZIP으로 압축 -> 다른 PC에 풀기 -> Start-Porta.bat 실행
