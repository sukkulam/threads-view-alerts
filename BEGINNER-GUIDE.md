# 처음부터 따라 하는 조회수 알림 설치

코딩을 처음 해 보는 사람을 위한 설명서입니다. **내 컴퓨터에서 Codex로 설치를 준비하고 → 내 Cloudflare에 배포하고 → 내 텔레그램으로 알림을 받는 순서**로 진행합니다. 설치 후에는 컴퓨터를 꺼도 내 Cloudflare 서버가 조회수를 확인합니다.

공개 소스: [sukkulam/threads-view-alerts](https://github.com/sukkulam/threads-view-alerts) · [기능·제한·업데이트 설명서](https://github.com/sukkulam/threads-view-alerts/blob/main/README.md)

설명서 확인일: 2026-10-14. 서비스의 메뉴 이름은 버전·언어·계정에 따라 조금 다를 수 있습니다. 화면이 다르면 해당 단계의 공식 안내를 함께 확인하세요.

## 시작 전에 알아둘 것

이 앱에서 “계정 등록”은 **확인할 공개 Threads 계정명을 목록에 넣는 것**입니다. Threads 비밀번호나 Meta API 키를 입력하는 과정은 없습니다. 로그인은 내 이메일로 하고, 알림은 내 텔레그램 봇으로 받습니다.

| 준비물 | 용도 |
| --- | --- |
| Windows 또는 Mac 컴퓨터 | 처음 설치할 때 사용합니다. 이 설명서는 Windows를 기준으로 합니다. |
| ChatGPT 계정과 Codex를 사용할 수 있는 환경 | AI가 파일과 명령을 다루며 설치를 도와줍니다. 기능·사용 한도는 본인 계정에서 확인하세요. |
| 본인 Cloudflare 계정과 이메일 | 앱을 운영하고 이메일 인증으로 로그인합니다. |
| Telegram 앱과 본인 계정 | 개인 봇을 만들고 알림을 받습니다. |
| Node.js LTS | 배포 명령을 실행하는 프로그램입니다. 3단계에서 설치합니다. |

**일반 ChatGPT 채팅에 주소를 보내는 것만으로 설치되지는 않습니다.** 이 설명서에서는 파일·터미널을 사용할 수 있는 로컬 Codex 환경을 사용합니다. 일반 GPT로 안내를 받고 아래 명령을 직접 실행해도 설치할 수 있습니다. [OpenAI 공식 기능 안내](https://learn.chatgpt.com/docs/use-chatgpt)

새 GitHub 계정, 개인 도메인 구매, OpenAI API 키는 이 설치 방법에 필요하지 않습니다. Cloudflare의 무료 한도·유료 요금과 AI 설치 대화의 사용량은 별개입니다. 요금 화면은 본인이 확인하고 선택하세요. [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/), [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/)

## 1. Codex 설치하고 로그인하기

1. [OpenAI 공식 데스크톱 앱 안내](https://learn.chatgpt.com/docs/app)를 엽니다.
2. 본인 운영체제의 다운로드를 선택해 설치합니다. Windows는 [공식 Windows 설치 안내](https://learn.chatgpt.com/docs/windows/windows-app)도 참고할 수 있습니다.
3. 앱을 실행하고 **본인의 ChatGPT 계정**으로 로그인합니다. 이 앱 설치를 위해 별도 OpenAI API 키를 만들 필요는 없습니다.
4. 제품 선택 메뉴에서 **Codex**를 선택합니다. 현재 공식 안내에서는 ChatGPT 데스크톱 앱 안에서 Codex를 선택합니다. 기존 Codex 앱을 사용하는 사람은 해당 앱에서 진행할 수 있습니다.

**완료 확인:** Codex 화면에서 프로젝트나 폴더를 열 수 있어야 합니다. 웹사이트의 일반 채팅창에 머물러 있다면 다음 단계의 폴더를 열 수 있는 데스크톱 환경으로 이동하세요. [OpenAI 공식 시작 안내](https://learn.chatgpt.com/docs/quickstart)

## 2. 조회수 알림 파일을 받고 Codex에서 열기

1. [이 GitHub 저장소](https://github.com/sukkulam/threads-view-alerts)를 엽니다.
2. 초록색 **Code → Download ZIP**을 누릅니다. 로그인 없이 공개 소스를 받을 수 있습니다.
3. 받은 ZIP을 우클릭해 **모두 압축 풀기**를 선택합니다. ZIP 안에서 직접 실행하지 마세요.
4. 압축을 푼 폴더 안으로 들어갑니다. `package.json`, `README.md`, `src`, `public`이 함께 있는 폴더가 설치 폴더입니다. GitHub ZIP의 폴더 이름은 보통 `threads-view-alerts-main`입니다.
5. Codex에서 **프로젝트 추가 / 폴더 열기**를 선택하고 그 설치 폴더를 엽니다. 상위 다운로드 폴더 전체를 선택하지 마세요.
6. 새 대화를 시작할 때 실행 위치를 **This computer / 이 컴퓨터 / Local**로 선택합니다. 이 설명서는 로컬 설치 경로를 사용합니다. [OpenAI 공식 실행 위치 안내](https://learn.chatgpt.com/docs/environments/modes)

**완료 확인:** Codex가 방금 받은 `package.json`과 `AI-INSTALL.md`를 읽을 수 있어야 합니다.

아래 요청을 새 대화에 그대로 붙여 넣으세요. 이후 단계에서 사용자 로그인이 필요하면 직접 진행하고, Codex에 완료했다고 알려주면 됩니다.

```text
이 폴더의 BEGINNER-GUIDE.md, README.md, AGENTS.md, AI-INSTALL.md를 읽고
Threads 조회수 알림을 내 Cloudflare 계정에 설치해줘.
나는 초보자이므로 지금 내가 눌러야 할 버튼과 입력할 값을 한 단계씩 알려줘.
가능한 파일 준비, 의존성 설치, 테스트, 설정, 배포 명령은 네가 실행해줘.
Cloudflare 로그인, 이메일 PIN, 봇 토큰 입력은 내가 직접 할게.
기존 서버나 DB를 사용하지 말고 내 계정을 확인한 뒤 전용 DB를 만들어줘.
배포 후 이메일 로그인, 실제 공개 조회수 수집, 텔레그램 테스트 수신,
예약 확인이 동작하는지 각각 확인하고, 확인하지 못한 항목은 구분해서 알려줘.
```

Codex가 명령 실행 승인을 요청하면 대상이 이 폴더와 본인 Cloudflare인지 확인하고 진행합니다. 화면에 승인한 명령이 실행된 것과 실제 알림이 도착한 것은 별도로 확인합니다.

## 3. Node.js 설치와 기본 검사

Codex가 설치와 검사를 진행할 수 있으면 맡기세요. 직접 실행할 때는 다음 순서입니다.

1. [Node.js 공식 다운로드](https://nodejs.org/en/download)에서 **LTS 설치판**을 받습니다. 이 앱은 Node 24 LTS를 권장하며 최소 버전은 22.13입니다.
2. 설치를 완료한 뒤 Codex와 터미널을 다시 엽니다. 기존 창에는 새 프로그램 경로가 반영되지 않을 수 있습니다.
3. 설치 폴더의 빈 곳을 우클릭해 **터미널에서 열기**를 선택합니다. 또는 Codex의 통합 터미널을 엽니다.
4. 아래 명령을 **한 줄씩** 붙여 넣고 Enter를 누릅니다. 검은 명령창의 앞쪽 경로나 `PS>` 표시는 입력하지 않습니다.

```powershell
node --version
npm.cmd install
npm.cmd test
```

Mac에서는 터미널에서 `npm.cmd`를 `npm`, `npx.cmd`를 `npx`로 바꾸어 실행합니다. Codex에는 해당 운영체제에 맞게 실행해 달라고 요청하면 됩니다.

**완료 확인:** Node 버전이 표시되고, 설치와 테스트가 오류 없이 끝나야 합니다. `package.json`을 찾지 못하면 한 단계 안쪽의 설치 폴더를 다시 여세요. 실패한 채로 다음 명령을 계속 실행하지 말고 오류 내용을 Codex에 알려주세요.

## 4. 내 Cloudflare 계정과 데이터베이스 준비

Cloudflare는 앱을 실행하는 서버이고, **D1**은 계정 목록·조회 기록·알림 설정을 보관하는 데이터베이스입니다.

1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에서 본인 계정을 만들거나 로그인하고, 이메일 인증을 마칩니다.
2. 계정이 여러 개면 이번 앱을 운영할 **본인 계정 하나**를 선택합니다.
3. 대시보드 검색에서 `Copy account ID`를 찾거나, **Workers & Pages → Account Details → Account ID**에서 값을 복사합니다. [공식 Account ID 찾기](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
4. **Storage & Databases → D1 / D1 SQL Database → Create database**에서 새 DB를 만듭니다. 이름은 `threads-view-alerts-db`로 합니다. 이미 같은 이름이 있다면 새 앱용으로 다른 이름을 쓰고 그 이름을 기록하세요.
5. 만든 DB에서 **Database ID**를 복사합니다. 이 앱에서는 테이블을 첫 사용 때 자동으로 만들므로 SQL 예제를 따로 입력하지 않아도 됩니다. [공식 D1 안내](https://developers.cloudflare.com/d1/get-started/)

**완료 확인:** 본인 Account ID, 새 D1 이름, 새 Database ID 세 가지를 확보합니다. Account ID는 계정을 가리키고, Database ID는 그 안의 DB를 가리킵니다. API 토큰이나 비밀번호를 이 값 대신 넣지 마세요.

Codex가 계정을 확인하고 새 DB를 만들어 준 경우에는 같은 DB를 한 번 더 만들 필요가 없습니다. 실제 생성된 이름과 ID를 확인하고 이어갑니다.

## 5. Cloudflare에 로그인하고 첫 배포하기

Codex가 실행할 수 있으면 맡기고, 본인 로그인 화면이 열리면 직접 처리하세요. 직접 실행할 때도 **같은 설치 폴더**에서 진행합니다.

```powershell
npx.cmd wrangler login
npx.cmd wrangler whoami
```

첫 명령은 브라우저 로그인·권한 허용 화면을 엽니다. Wrangler는 Cloudflare 배포 도구입니다. 화면에서 본인 계정인지 확인하고 허용하세요. `whoami` 결과에 이번에 사용할 계정이 있는지 확인합니다.

이어서 설정 도우미를 실행합니다.

```powershell
npm.cmd run configure
```

| 도우미가 묻는 항목 | 첫 배포 때 넣을 값 |
| --- | --- |
| 서버 이름 | 기본값은 Enter. 바꾸려면 `threads-view-alerts-` 뒤에 영문 소문자·숫자·하이픈으로 구분합니다. |
| 본인 Cloudflare Account ID | 4단계에서 복사한 계정 ID |
| 새 D1 데이터베이스 이름 | 방금 만든 DB 이름 |
| 새 D1 Database ID | 방금 만든 DB의 ID |
| Access 팀 도메인 | **Enter로 비웁니다.** 6단계 후에 입력합니다. |
| Access Application Audience AUD | **Enter로 비웁니다.** 6단계 후에 입력합니다. |

각 답을 입력할 때마다 Enter를 누릅니다. 설정은 개인 `wrangler.json`에 저장됩니다. 이제 배포합니다.

```powershell
npm.cmd run deploy
```

처음 Workers를 사용하면 본인의 `workers.dev` 하위 도메인을 정하라는 안내가 나올 수 있습니다. 화면 안내를 따라 생성한 뒤 같은 배포 명령을 다시 실행하세요. 별도 개인 도메인을 구매할 필요는 없습니다. [공식 첫 배포 안내](https://developers.cloudflare.com/workers/get-started/guide/)

**완료 확인:** 배포 결과에 나온 **본인의 HTTPS 주소**를 복사해 둡니다. 이 주소가 이후 접속할 앱 주소입니다. 아직 로그인 설정이 없으므로 “서버 설치가 아직 완료되지 않았습니다”라는 안내가 나와도 정상입니다. 다음 단계를 마쳐야 사용할 수 있습니다.

## 6. 내 이메일로만 로그인하게 설정하기

**Cloudflare Access**는 앱 앞에 놓는 이메일 로그인 화면입니다. 설정할 값은 팀 도메인과 앱 AUD 두 개입니다.

### 6-1. Zero Trust 조직과 이메일 PIN

1. Cloudflare 대시보드에서 **Zero Trust / Cloudflare One**을 엽니다.
2. 처음이면 본인의 조직을 만듭니다. 팀 이름을 정하고 본인에게 맞는 요금·약관을 확인합니다. 공식 안내상 Free 선택 시에도 가입 과정에서 결제 정보 입력을 요구할 수 있습니다. 해당 정보는 본인이 공식 화면에서 입력하고, 유료 업그레이드 여부도 직접 결정합니다. [공식 Zero Trust 시작 안내](https://developers.cloudflare.com/cloudflare-one/setup/)
3. **Zero Trust → Settings → Team name and domain**에서 본인의 **팀 도메인**을 기록합니다. 형식은 `https://팀이름.cloudflareaccess.com`입니다. 조회수 앱 주소와 다른 값입니다.
4. **Integrations → Identity providers → Add new identity provider → One-time PIN**을 추가합니다. 이미 있으면 다시 만들지 않아도 됩니다. [공식 이메일 PIN 안내](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)

### 6-2. 조회수 앱 전체에 Access 연결

1. **Access controls / Access → Applications → Add an application / Create new application**을 엽니다.
2. **Self-hosted** 유형을 선택합니다. 화면에 `Self-hosted and private`로 표시될 수도 있습니다.
3. 앱 이름을 `Threads 조회수 알림`으로 정합니다.
4. 공개 호스트 또는 애플리케이션 도메인에 **5단계에서 받은 Worker 주소의 호스트 전체**를 넣습니다. `https://`와 뒤쪽 경로는 제외합니다. `workers.dev` 주소가 도메인 목록에 없으면 **사용자 지정 입력 / Custom input**을 찾습니다.
5. 특정 경로만 지정하지 말고 그 앱의 호스트 전체를 보호합니다. 다른 앱의 호스트를 넣지 마세요.
6. 정책의 **Action / Decision은 Allow**, **Include의 Selector는 Emails**, **Value는 본인의 로그인 이메일**로 설정합니다. 이메일 도메인 전체나 Everyone을 선택하지 않습니다.
7. 앱의 로그인 방법에 **One-time PIN**을 선택하고 저장합니다.
8. 만든 앱의 **Configure → Additional settings → Application Audience (AUD) Tag**를 복사합니다. AUD는 이 로그인 앱의 식별값이며 계정 ID·DB ID와 다릅니다.

[공식 Workers Access 안내](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [공식 AUD 찾기](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/#get-your-aud-tag)

메뉴가 달라 호스트 입력이 안 되면 같은 공식 Workers Access 안내의 **Protect one Worker** 경로를 사용할 수 있습니다. 본인 Worker의 **Access → Protect this Worker behind Access → All traffic**으로 앱을 보호한 뒤, Zero Trust의 해당 Access 앱에서 허용 이메일·PIN 방법·AUD를 확인합니다. 호스트 방식으로 이미 보호했다면 같은 앱을 중복 생성하지 마세요.

### 6-3. 로그인 값을 앱에 반영하고 보관 키 등록

설치 폴더에서 설정 도우미를 다시 실행합니다.

```powershell
npm.cmd run configure
```

서버 이름·Account ID·DB 이름·Database ID는 **Enter로 기존 값을 유지**합니다. 마지막 두 항목에 이번에는 **팀 도메인 전체(`https://` 포함)**와 **AUD**를 입력합니다. 두 항목을 모두 입력해야 합니다.

```powershell
npm.cmd run deploy
npm.cmd run secret:init
```

`secret:init`은 봇 토큰을 암호화해 보관할 키를 자동 생성하고 서버에 등록합니다. 키 원문은 채팅에 붙이지 않습니다. 생성된 `.setup/token-encryption-key.txt`는 본인만 복구용으로 보관하세요. 기존 서버에 키가 있다는 안내가 나오면 새 키로 덮어쓰지 말고 원래 백업을 확인합니다.

**완료 확인:** 본인 앱 주소를 새 브라우저 창에서 열면 이메일 인증 화면이 나옵니다. 허용한 이메일을 넣고 메일로 받은 PIN으로 로그인했을 때 조회수 알림 화면이 열리면 성공입니다. 이미 인증한 브라우저는 PIN 화면을 생략할 수 있습니다. 앱에 표시된 로그인 이메일도 확인하세요.

## 7. 텔레그램 봇 만들기

여기서는 **본인과 봇의 1:1 대화**로 알림을 받습니다. 그룹 설정은 필요하지 않습니다.

1. Telegram 앱에서 공식 [@BotFather](https://t.me/BotFather)를 엽니다.
2. **Start / 시작**을 누르고 `/newbot`을 보냅니다.
3. 봇의 표시 이름을 입력합니다. 예: `내 조회수 알림`.
4. 봇 사용자명을 입력합니다. 영문·숫자·밑줄을 사용하고 `bot`으로 끝나야 합니다. 이미 사용 중이면 다른 이름을 정합니다.
5. BotFather가 만든 봇의 링크와 **봇 토큰**을 보내 줍니다. 토큰은 봇을 제어하는 비밀값이므로 아래의 내 앱 입력칸에만 붙여 넣습니다.
6. BotFather가 알려준 **새 봇 링크**를 엽니다. 그 대화에서 **Start / 시작**을 누르거나 `/start`를 보냅니다. **BotFather에게 보내는 것이 아니라 새로 만든 내 봇에게 보내야 합니다.**

**완료 확인:** 새 봇의 대화에 내가 보낸 `/start`가 있어야 합니다. 아직 봇이 답장하지 않아도 괜찮습니다. [Telegram 공식 봇 생성 안내](https://core.telegram.org/bots/features#creating-a-new-bot)

## 8. 내 앱에 텔레그램 연결하고 테스트하기

1. 이메일로 로그인한 **본인의 배포 주소**를 엽니다. `127.0.0.1` 로컬 미리보기 주소를 사용하지 않습니다.
2. **내 텔레그램 연결 → 봇 토큰**에 방금 받은 토큰을 직접 붙여 넣습니다. Codex 채팅·GitHub·설명서에 넣지 마세요.
3. **내 대화 ID 찾기**를 누릅니다.
4. 표시된 목록에서 본인 대화를 선택합니다. **대화 ID** 입력칸에 숫자가 들어갑니다. 이것이 알림을 받을 대화의 식별값입니다.
5. **텔레그램 연결 저장**을 누릅니다.
6. **테스트 알림 보내기**를 누릅니다.
7. Telegram을 열어 내 봇에서 **“텔레그램 연결 테스트에 성공했습니다”** 메시지가 실제로 왔는지 확인합니다.

**완료 확인:** 웹페이지의 성공 안내와 Telegram의 실제 수신을 둘 다 확인합니다. 저장 후 토큰 입력칸이 비는 것은 정상입니다. 저장된 토큰 원문을 화면에 다시 표시하지 않습니다.

목록이 비면 내 봇에게 `/start`를 다시 보내고 바로 찾기를 누르세요. 다른 봇 프로그램이 같은 토큰을 사용 중이면 자동 찾기가 충돌할 수 있습니다. 그 서비스를 지우기보다는 이 앱 전용 봇을 새로 만드세요.

## 9. Threads 계정 등록하고 자동 확인 검증하기

1. **확인할 대상 등록**에 본인이 원하는 공개 `@계정명`, 프로필 링크 또는 개별 게시물 링크를 넣습니다. 설명서 작성자의 계정이 자동으로 등록되지는 않습니다.
2. **알림 기준 조회수**를 입력합니다. 예: `5000`.
3. **확인 주기**에서 10·20·30·60분 중 고릅니다. 예: `20분`.
4. **대상 등록 +**를 누릅니다.
5. 대상 카드의 **지금 확인**을 눌러 첫 수집 결과를 확인합니다. 최근 조회수와 마지막 성공 시각·오류를 살펴보세요.
6. 대상이 켜진 상태로 선택한 주기 이후 다시 접속해 마지막 확인 시각이 갱신되는지 확인합니다. 서버가 1분마다 차례로 처리하므로 정확히 정각에 실행되지는 않을 수 있습니다. 새 cron 설정이 전체 서버에 반영되기까지는 최대 15분 걸릴 수 있습니다. [공식 예약 실행 안내](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

**완료 확인:** 텔레그램 테스트 수신, 실제 공개 조회수 수집, 예약 확인 시각 갱신을 각각 확인합니다. 테스트 메시지가 왔다고 Threads 수집까지 성공한 것은 아닙니다. 조회수 오류가 있으면 그 대상을 확인하고 아래 문제 해결을 참고하세요.

계정 등록은 최신 원글을 발견하고 최대 20개 게시물을 추적합니다. 모든 과거 글을 확인하지는 않습니다. 사용자당 대상은 최대 10개이며 서버 전체 확인량 제한도 있습니다. 자세한 제한은 [README](https://github.com/sukkulam/threads-view-alerts/blob/main/README.md)에 있습니다.

등록 당시 이미 기준 이상인 게시물도 첫 확인 때 알립니다. 같은 게시물·기준·수신 대화로 성공한 알림은 반복하지 않으므로, 매번 메시지가 오지 않는 것이 정상일 수 있습니다. Threads가 비로그인 공개 페이지에서 정확한 조회수를 제공하지 않으면 수집은 실패할 수 있으며, 앱은 임의 숫자를 넣지 않고 마지막 성공 값과 오류를 표시합니다.

## 10. 다음부터 접속하기와 보관할 것

- **접속:** 본인의 배포 주소를 즐겨찾기합니다. Windows 바탕화면에서 **새로 만들기 → 바로가기**를 선택하고 그 주소를 입력해 `조회수 알림`으로 저장해도 됩니다.
- **컴퓨터 종료:** 설치 후에는 Codex·터미널·웹페이지를 닫아도 Cloudflare가 예약 확인합니다. 조회수 확인 자체에는 GPT API 사용량이 들지 않습니다.
- **설치 폴더 보관:** 개인 `wrangler.json`과 `.setup` 폴더를 유지합니다. DB 백업과 함께 본인만 보관하고 업데이트 때 같은 계정·DB·보관 키를 사용합니다.
- **알림 중단:** 앱에서 대상을 일시정지합니다. 서버의 예약 실행도 끄려면 README의 중단 안내를 확인하세요.
- **다른 사람에게 전달:** 공개 GitHub 주소와 이 설명서를 보내세요. 그 사람도 본인의 Cloudflare와 봇으로 설치합니다. 설치를 마친 내 폴더 전체를 압축해 보내지 않습니다.

## 막혔을 때 확인하기

| 화면이나 증상 | 먼저 할 일 |
| --- | --- |
| Codex가 명령을 실행하지 못하고 설명만 함 | 일반 Chat 대신 Codex 로컬 프로젝트에서 설치 폴더를 열었는지 확인합니다. 도구를 사용할 수 없는 환경이면 설명서의 명령을 직접 실행합니다. |
| `node`를 찾을 수 없음 | Node.js LTS를 설치하고 Codex·터미널을 다시 엽니다. |
| `npm.ps1` 실행이 차단됨 | Windows에서는 이 설명서대로 `npm.cmd`, `npx.cmd`를 사용합니다. 시스템 실행 정책을 바꿀 필요는 없습니다. |
| `package.json`을 찾을 수 없음 | ZIP 압축을 풀고 `package.json`이 실제로 보이는 폴더에서 실행합니다. |
| Cloudflare 권한·계정 오류 | `npx.cmd wrangler whoami`의 계정과 설정의 Account ID를 비교합니다. 로그인한 계정이 틀리면 Codex와 확인해 로그아웃 후 본인 계정으로 로그인합니다. |
| DB ID 오류 | Account ID 대신 새 D1의 Database ID를 입력했는지 확인하고 `configure`를 다시 실행합니다. |
| 서버 설치 미완료 | 팀 도메인·AUD를 둘 다 입력한 뒤 재배포했는지 확인합니다. |
| PIN 메일이 안 옴 | 허용 정책의 정확한 이메일, 앱의 One-time PIN 선택, 스팸함을 확인합니다. |
| 인증 후 거부됨·로그인 반복 | 보호한 호스트가 실제 앱 주소인지, 해당 Access 앱의 AUD와 팀 도메인을 넣었는지 확인합니다. 앱을 삭제해 다시 만드는 방식으로 해결하지 마세요. |
| 알림 보관 설정 필요 | 최종 배포 뒤 `npm.cmd run secret:init`을 완료합니다. 기존 키가 있으면 원래 백업을 복원합니다. |
| 대화 ID 목록이 비어 있음 | BotFather가 아닌 **내 봇**에게 `/start`를 다시 보냅니다. 앱 전용 봇인지 확인합니다. |
| 테스트 알림이 안 옴 | 연결 저장을 눌렀는지, 올바른 토큰·대화인지, 봇을 차단하지 않았는지 확인합니다. |
| 공개 조회수 오류 | 해당 글이 공개·존재하는지 확인합니다. Threads의 접근 제한·구조 변경이면 텔레그램 연결과 별도로 해결해야 합니다. |
| 자동 확인이 안 됨 | 대상이 켜져 있는지와 마지막 오류를 확인합니다. Codex에 해당 Worker의 DB 연결·보관 키·1분 cron 설정을 점검해 달라고 요청합니다. 새 예약 설정은 반영까지 시간이 걸릴 수 있습니다. |

해결이 안 되면 Codex에 **멈춘 단계 번호와 오류 문구**를 보내세요. 토큰·비밀번호·이메일 PIN·보관 키는 가리고 전달합니다. 다음 문장을 붙여 넣어도 됩니다.

```text
BEGINNER-GUIDE.md의 __단계에서 멈췄어.
오류는 아래와 같아. 본인 계정과 현재 설정을 확인해서 이어서 해결해줘.
DB 삭제, 로그인 보호 해제, 기존 보관 키 변경 없이 원인을 먼저 확인해줘.

[비밀값을 지운 오류 문구]
```
