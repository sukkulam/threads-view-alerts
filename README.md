# Threads 조회수 알림 — 개인 서버 설치 설명서

이 패키지는 조회수 알림만 담은 독립 웹앱입니다. 받는 사람마다 **본인 Cloudflare 계정에 Workers 서버와 D1 데이터베이스를 만들고**, 자신의 이메일로 로그인해 자신의 Threads 계정과 텔레그램을 등록합니다. 패키지를 준 사람의 서버·데이터베이스·GPT 사용량을 사용하지 않습니다.

하나의 개인 서버에 지인을 초대하는 것도 가능합니다. 서버 관리자가 허용한 이메일만 로그인하고, 앱에서는 사용자별로 등록 대상과 텔레그램 설정을 분리합니다. 그 경우 운영 사용량은 해당 서버 관리자 계정에 귀속됩니다. Cloudflare 계정 관리자는 데이터베이스를 관리할 수 있으므로 본인이 관리하는 서버에 설치하세요.

## 이 주소를 GPT/Codex에 전달해서 설치하기

공개 저장소: [sukkulam/threads-view-alerts](https://github.com/sukkulam/threads-view-alerts)

아래 내용을 복사해 **본인의 GPT/Codex**에 보내세요.

```
https://github.com/sukkulam/threads-view-alerts

이 저장소의 README.md, AGENTS.md, AI-INSTALL.md를 읽고
조회수 알림 앱을 내 Cloudflare 계정에 설치해줘.
가능한 파일 준비, 설치, 검사, 설정, 배포 작업을 진행해줘.
Cloudflare 로그인과 이메일 인증, 개인 봇 토큰 입력은 내가 직접 하도록 안내해줘.
배포 후 내 주소에서 로그인하고, 내 Threads 계정을 등록하고,
내 텔레그램으로 테스트 알림을 받는 것까지 확인해줘.
완료했다고 하기 전에 실제 배포·로그인·수신 확인 결과를 구분해서 알려줘.
```

파일과 터미널을 사용할 수 있는 **Codex 또는 해당 도구가 제공되는 GPT 작업 환경**에서 실제 설치를 진행할 수 있습니다. 일반 텍스트 대화에서는 AI가 설명과 실행할 명령을 제공하며, 사용자가 터미널에서 실행해야 합니다. 주소를 보냈다는 것만으로 계정 로그인이나 서버 설치가 완료되는 것은 아닙니다. [OpenAI 공식 시작 안내](https://learn.chatgpt.com/docs/quickstart)

AI가 저장소 주소를 읽지 못하면 GitHub의 **Code → Download ZIP**으로 받아 압축을 풀고, Codex에서 그 폴더를 열어 같은 요청을 보내세요. 공개 소스에는 개인 계정·DB·봇 설정이 없으므로 각자 생성해야 합니다. 자세한 AI 작업 절차는 [AI-INSTALL.md](https://github.com/sukkulam/threads-view-alerts/blob/main/AI-INSTALL.md)에 있습니다.

Git이 있는 컴퓨터에서는 아래와 같이 받습니다.

```
git clone https://github.com/sukkulam/threads-view-alerts.git
cd threads-view-alerts
```

서버 설치 없이 조회수 알림 페이지를 다른 사람의 계정에 연결해 주는 공용 서비스가 아니라, **각자의 계정에서 운영하는 앱**입니다. 앱 자체는 GPT/OpenAI API 키를 요청하지 않습니다.

## 먼저 준비할 것

- 설치자 본인의 Cloudflare 계정과 이메일 수신이 가능한 주소.
- [Node.js 공식 다운로드](https://nodejs.org/en/download)의 LTS 설치판. 권장 Node 24 LTS, 최소 22.13.
- 텔레그램 앱. 각자 새로 만든 개인 전용 봇을 사용합니다.
- Windows에서는 ZIP을 풀고 **package.json이 있는 폴더**에서 시작합니다. 배포 ZIP은 `threads-view-alerts`, GitHub의 Code → Download ZIP은 보통 `threads-view-alerts-main` 폴더입니다. `START-HERE.html`을 더블클릭하면 이 설명서를 볼 수 있습니다.

아래 명령은 Windows PowerShell 기준입니다. 탐색기에서 폴더의 빈 곳을 우클릭하고 **터미널에서 열기**를 선택하세요. macOS/Linux에서는 `npm.cmd`, `npx.cmd`를 각각 `npm`, `npx`로 바꾸면 됩니다.

## 1. 프로그램 설치

```
node --version
npm.cmd install
```

`node`를 찾지 못하면 Node.js LTS를 설치하고 터미널을 다시 여세요. `package.json`, `src`, `public`이 있는 폴더에서 명령을 실행해야 합니다.

## 2. 내 Cloudflare에 새 데이터베이스 만들기

1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에서 **본인 계정**을 선택합니다.
2. 계정의 **Account ID**를 복사해 둡니다. API 토큰과는 다릅니다.
3. **Storage & Databases → D1 → Create database**에서 새 DB를 만듭니다. 이름은 `threads-view-alerts-db`로 하세요.
4. 만든 DB의 **Database ID**를 복사합니다. 다른 앱에서 쓰던 DB를 선택하지 마세요.
5. 터미널에서 설정 도우미를 실행합니다.

```
npm.cmd run configure
```

서버 이름은 기본값 `threads-view-alerts`를 사용하거나 `threads-view-alerts-개인명`으로 정합니다. 본인 Account ID, 새 DB 이름, Database ID를 입력하세요. **최초 배포 전에는 Access 팀 도메인과 AUD 두 항목을 Enter로 비워 둡니다.**

입력한 개인 배포 정보는 `wrangler.json`에 저장됩니다. 배포 주소와 DB 연결에는 이 정보가 사용됩니다. DB 테이블은 앱의 첫 사용 때 자동으로 추가됩니다.

## 3. 내 Cloudflare에 첫 배포

```
npx.cmd wrangler login
npx.cmd wrangler whoami
npm.cmd run deploy
```

브라우저에서 본인의 Cloudflare로 로그인하세요. `whoami`로 로그인한 계정을 확인합니다. 이전 사람의 CLI 로그인이 남아 있다면 먼저 `npx.cmd wrangler logout`을 실행하고 다시 로그인하세요.

배포가 완료되면 **본인의 `https://서버명.내하위도메인.workers.dev` 주소**가 표시됩니다. 이 주소를 적어 두세요. 아직 로그인 설정이 없어 페이지에 설치 미완료가 표시되는 것은 정상입니다. 설정을 끝내기 전에는 데이터 접근과 자동 확인이 열리지 않습니다.

## 4. 이메일 로그인 설정

1. Cloudflare의 **Zero Trust / Cloudflare One** 조직을 만듭니다. 팀 이름을 정하면 `https://팀이름.cloudflareaccess.com` 팀 도메인이 생깁니다.
2. **Zero Trust → Integrations → Identity providers → Add new identity provider → One-time PIN**을 추가합니다. 새 조직에는 이메일 PIN 로그인이 자동으로 추가되지 않을 수 있으므로 직접 확인하세요.
3. **Access controls → Applications → Add an application → Self-hosted**를 선택합니다.
4. 앱 이름을 `Threads 조회수 알림`으로 하고, 공개 호스트 이름에는 **3단계에서 받은 본인의 Worker 호스트 전체**를 입력합니다. `https://`를 제외한 `서버명.내하위도메인.workers.dev` 형식입니다. 특정 경로만 보호하지 말고 호스트 전체를 보호하세요.
5. 허용 정책은 **Allow → Include → Emails**로 만들고 **본인의 로그인 이메일**을 넣습니다. 지인을 같은 서버에 초대할 때만 그 사람의 이메일도 추가합니다.
6. 이 앱의 로그인 방법에 **One-time PIN**을 선택하고 저장합니다.
7. 앱의 **Configure → Additional settings → Application Audience (AUD) Tag**를 복사합니다.

다시 설정 도우미를 실행합니다.

```
npm.cmd run configure
```

서버·계정·DB 항목은 Enter로 기존 값을 유지하고, 이번에는 **Access 팀 도메인 전체**와 **AUD**를 입력합니다. 이어서 최종 배포와 알림 보관 키 설정을 실행합니다.

```
npm.cmd run deploy
npm.cmd run secret:init
```

`secret:init`은 암호화 키를 만들어 본인 Worker의 비밀 설정에 등록합니다. 실제 키를 화면에 출력하지 않습니다. 로컬 `.setup/token-encryption-key.txt`는 복구용 백업이므로 본인만 별도로 보관하세요. 원래 키 없이 기존 서버에 새 키를 덮어쓰는 작업은 도우미가 막습니다.

이제 본인의 Worker 주소를 열면 이메일 인증 화면이 나옵니다. 허용된 이메일을 입력하고 메일로 받은 PIN으로 로그인하세요. 이 로그인에는 ChatGPT 계정이 필요하지 않습니다. [Cloudflare 이메일 PIN 안내](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)

## 5. 내 텔레그램 연결

1. 텔레그램에서 [BotFather](https://t.me/BotFather)를 엽니다. `/newbot`을 보내고 봇 이름과 `bot`으로 끝나는 사용자명을 정합니다.
2. BotFather가 준 봇 토큰을 복사합니다. **설정 파일·단체 대화·다른 사람에게 보내는 ZIP에는 넣지 마세요.**
3. 만든 봇의 대화를 열고 **그 봇에게** `/start`를 보냅니다. BotFather에 보내는 것과 다릅니다.
4. 본인 웹앱의 **내 텔레그램 연결 → 봇 토큰**에 붙여 넣고 **내 대화 ID 찾기**를 누릅니다.
5. 나온 대화를 선택하고 **텔레그램 연결 저장**을 누릅니다.
6. **테스트 알림 보내기**를 눌러 본인의 텔레그램에 메시지가 오는지 확인합니다.

최근 대화가 비어 있으면 새로 `/start`를 보내고 다시 찾으세요. 다른 봇 프로그램에서 같은 토큰을 사용하면 자동 찾기가 실패할 수 있습니다. 이 경우 그 프로그램을 통해 본인의 대화 ID를 확인해 직접 입력하거나, 조회수 알림용 새 봇을 만드세요. 앱은 기존 webhook을 삭제하지 않습니다. [Telegram 봇 만들기](https://core.telegram.org/bots/features#creating-a-new-bot), [Telegram Bot API](https://core.telegram.org/bots/api#getupdates)

## 6. Threads 계정 등록과 사용

1. **확인할 대상 등록**에 `@계정명`, 공개 프로필 주소 또는 개별 게시물 주소를 입력합니다.
2. 기준 조회수와 **10 / 20 / 30 / 60분** 중 확인 주기를 선택합니다. 기본값은 5,000회·30분입니다.
3. **대상 등록**을 누릅니다. 예약 확인이 시작되거나 **지금 확인**을 눌러 첫 조회를 실행할 수 있습니다.
4. 기준 이상일 때 텔레그램으로 알립니다. 등록 당시 이미 기준 이상인 글도 첫 확인 때 알립니다.
5. 등록 카드에서 기준·주기를 바꾸거나, 일시정지·다시 켜기·삭제할 수 있습니다. **연결 해제**는 내 봇 설정을 삭제하고 내 대상 전체를 일시정지합니다.

계정별로 공개 프로필의 최신 원글 10개를 발견하고, 최근 등록된 게시물 최대 20개를 추적합니다. 모든 과거 글을 무제한으로 확인하지는 않습니다. 오래된 글은 개별 주소로 등록하세요. 사용자당 등록 대상은 10개입니다.

서버는 1분마다 기한이 된 대상 한 개를 확인합니다. 실제 확인에는 약간의 지연이 있을 수 있습니다. 서버 전체가 처리할 수 있는 양을 넘기지 않도록 활성 대상의 확인량을 제한합니다. 모두 같은 주기라면 10분은 8개, 20분은 16개, 30분은 24개까지이며 사용자별 10개 제한도 적용됩니다. 혼합 주기는 합산하며, 꽉 찼다는 메시지가 나오면 주기를 늘리거나 다른 대상을 일시정지하세요.

같은 게시물·같은 기준·같은 수신 대화에 성공한 알림은 반복하지 않습니다. 기준이나 수신 대화를 바꾸면 새로운 알림 조건이 됩니다. 외부 전송 후 DB 기록이 실패하는 드문 경우에는 알림이 중복될 수 있습니다.

Windows 바탕화면에 바로가기를 만들려면 빈 곳을 우클릭하고 **새로 만들기 → 바로가기**에서 본인의 Worker 주소를 입력하세요. 이름을 `조회수 알림`으로 저장하면 다음부터 더블클릭해 접속할 수 있습니다.

## 7. 다른 사람에게 공유하기

공개 저장소 주소를 전달하거나 **처음 받은 깨끗한 배포 ZIP**을 전달하세요. 받는 사람은 위의 GPT/Codex용 요청을 사용하거나 1~6단계를 본인 Cloudflare와 본인 텔레그램으로 진행합니다. 그러면 서버 주소, 데이터, 봇, 사용량이 전부 각자의 계정에 속합니다.

설치 후 자신의 폴더 전체를 다시 압축해 보내면 안 됩니다. 개인 `wrangler.json`, `.setup`, `.dev.vars`, `.wrangler`, 데이터 백업을 공유하지 마세요. 소스 수정 후 새 배포판을 만들 때는 `node scripts/package.mjs`를 사용하세요. 허용된 앱 소스·기본 설정·설명서·테스트만 `releases`에 압축하고 개인 설정은 제외합니다.

한 서버를 함께 쓰기로 정한 지인은 관리자가 Access 정책에 이메일을 추가한 후 **그 서버 주소**로 로그인하면 됩니다. 각자 자신의 계정 목록과 텔레그램을 등록합니다. 서버 주소만 아는 임의의 사람에게는 로그인 권한이 생기지 않습니다.

## 8. 비용·데이터·업데이트

- 자동 조회·조회수 비교·텔레그램 발송에는 GPT/OpenAI 또는 Meta API가 필요하지 않습니다.
- Workers 실행과 D1 저장 사용량은 **설치자 Cloudflare 계정**에 집계됩니다. 무료 한도와 유료 요금은 각자 계정에서 확인하세요. [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/), [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/)
- 서버에 배포한 뒤에는 설치용 컴퓨터나 웹페이지를 꺼도 예약 확인이 계속됩니다. 인터넷 공개 페이지의 응답 상태에 영향을 받습니다.
- `.setup`의 키 백업, 개인 `wrangler.json`, Cloudflare D1 백업을 본인이 보관하세요. DB 백업에는 암호화된 봇 설정과 개인 조회 기록이 포함됩니다.
- 업데이트할 때 자신의 `wrangler.json`과 `.setup`을 유지하고 앱 소스·public·scripts만 갱신합니다. `npm.cmd install`, `npm.cmd test`, `npm.cmd run deploy`를 실행합니다. 기존 DB를 재생성하거나 보관 키를 바꾸지 마세요.
- 중단하려면 앱에서 모든 대상을 일시정지하세요. 서버의 예약 실행도 끄려면 개인 `wrangler.json`에서 `triggers.crons`를 빈 배열 `[]`로 바꾸고 다시 배포합니다.

## 문제가 생겼을 때

- **설치 미완료:** 팀 도메인·AUD를 모두 입력하고 재배포했는지 확인하세요.
- **로그인 메일이 안 옴:** Access 정책에 해당 이메일이 있고 One-time PIN 로그인 방법이 선택됐는지 확인하세요. 스팸함도 확인합니다.
- **계정별 정보가 다름:** 설정은 로그인한 사용자별로 분리됩니다. 같은 이메일·같은 서버로 로그인하세요.
- **토큰 보관 설정 필요:** `npm.cmd run secret:init`을 완료하세요. 기존 키가 있으면 원래 키 백업부터 복원합니다.
- **공개 조회수 오류:** 비공개·삭제·접근 제한 또는 Threads 구조 변경일 수 있습니다. 마지막 성공 값은 보존됩니다. 페이지에 정확한 조회수가 제공돼야 확인할 수 있습니다.
- **자동 확인이 안 됨:** 대상이 켜져 있는지, 마지막 오류가 있는지 확인합니다. Cloudflare Worker에 `* * * * *` 예약 작업과 `DB` 연결, 보관 키가 있는지 확인하세요. 처음 예약 작업을 배포한 뒤 적용에 시간이 걸릴 수 있습니다.
- **텔레그램 수신 실패:** 봇 토큰, 대화 ID, 봇에 보낸 `/start`, 봇 차단 여부를 확인합니다. 테스트 알림으로 다시 확인하세요.

## 로컬 미리보기와 검증

```
npm.cmd test
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:8791`을 엽니다. 로컬 테스트 사용자로 자동 로그인하며 테스트 데이터만 저장합니다. 운영 로그인 우회는 공개 HTTPS에서 동작하지 않습니다. 미리보기에는 개인 토큰이 자동으로 들어가지 않으므로 텔레그램 저장은 보관 키가 없다는 안내를 표시합니다. 운영에서 사용할 설정은 배포한 본인 주소에 로그인해 등록하세요.

검증에는 사용자 간 데이터 접근 제한, 서명 위조 거부, CSRF, 입력 크기 제한, 조회수 보존, 중복 알림, 확인 주기, 동시 확인 방지와 개인 배포 설정 검사가 포함됩니다. 실제 개인 계정의 이메일 인증과 텔레그램 수신은 설치 후 위 절차로 확인해야 합니다.

기술 참고: [Access JWT 서명 검증](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [workers.dev 접근 보호](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [D1 명령](https://developers.cloudflare.com/workers/wrangler/commands/d1/).
