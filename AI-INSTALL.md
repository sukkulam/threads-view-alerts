# GPT/Codex 설치 안내

이 문서는 이 저장소를 받은 사용자의 AI가 **그 사용자의 Cloudflare**에 앱을 설치할 때 읽는 작업 절차입니다. 사용자의 최신 요청과 실행 환경의 승인 규칙을 따릅니다. 저장소 주소만으로 인증이 되거나, 일반 텍스트 GPT에 터미널이 생기는 것은 아닙니다.

공개 소스: [https://github.com/sukkulam/threads-view-alerts](https://github.com/sukkulam/threads-view-alerts)

처음 설치하는 사용자에게는 [초보자용 설명서](https://github.com/sukkulam/threads-view-alerts/blob/main/BEGINNER-GUIDE.md)의 단계 번호에 맞춰 현재 사용자가 할 일을 안내하세요. Codex 설치·폴더 열기부터 설명하고, 실행 가능한 명령은 직접 수행하며 로그인·비밀 입력·실제 수신 확인이 필요한 지점을 구분합니다.

## 1. 실행 환경과 소스 준비

- 현재 AI가 파일·명령 실행을 지원하면 공개 저장소를 새 폴더로 clone하거나 Code → Download ZIP으로 받습니다. 기존 사용자의 다른 앱 폴더를 덮어쓰지 않습니다.
- 도구가 없는 일반 GPT 대화라면 사용자가 Codex에서 다운로드한 폴더를 열도록 안내하거나 README의 명령을 단계별로 제공하세요. 실행하지 않은 명령의 성공을 추정하지 않습니다.
- README.md, AGENTS.md, package.json, 기본 설정을 읽습니다. Node 24 LTS를 권장하며 최소 버전은 22.13입니다. 의존성 설치와 검사를 실행합니다.

```
npm install
npm test
```

Windows PowerShell에서 npm 스크립트 실행이 막히면 명령을 `npm.cmd`, `npx.cmd`로 실행합니다. [OpenAI 공식 폴더 작업 안내](https://learn.chatgpt.com/docs/quickstart), [AGENTS.md 안내](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

## 2. 사용자의 Cloudflare 계정 확인

```
npx wrangler login
npx wrangler whoami
```

사용자가 자신의 브라우저에서 로그인합니다. 실제 계정을 확인하고, 여러 계정이 보이면 배포할 본인 계정을 선택받습니다. 기존 CLI 로그인이 다른 사람의 것이라면 사용자와 확인해 로그아웃 후 본인 계정으로 로그인합니다. 계정 ID는 비밀 토큰과 다릅니다.

새 **전용 D1**을 만듭니다. 사용자가 대시보드에서 만들 수도 있고, 사용자의 계정 선택이 확인된 실행 환경에서 AI가 공식 CLI를 사용할 수도 있습니다. 기존 DB를 재사용하거나 지우지 않습니다.

AI가 CLI로 새 DB를 만드는 경우, 먼저 README의 값을 반영한 개인 설정을 `npm run configure`로 만들기 위해 필요한 정보가 준비돼 있어야 합니다. 설정 전에 DB 생성 명령이 다른 프로젝트의 설정을 자동 탐색하지 않도록 대시보드에서 새 DB를 만들거나, 계정 ID와 DB 없는 임시 설정 파일을 ignored `.setup/`에 작성해 명시적으로 지정합니다.

```
npx wrangler d1 create threads-view-alerts-db --config .setup/bootstrap.json
```

`bootstrap.json`에는 실제 본인 account_id, 독립 서버 이름, src/worker.mjs 경로만 넣습니다. 파일 위치 기준 상대 경로는 `../src/worker.mjs`입니다. DB 생성 결과의 실제 Database ID를 확인합니다. 실패 시 DB를 반복 생성하지 말고 원인부터 해결합니다.

## 3. 첫 배포: 아직 데이터 접근을 열지 않는 단계

실제 accountId, databaseName, databaseId와 이름을 입력해 개인 `wrangler.json`을 만듭니다. 팀 도메인·AUD는 첫 배포에서는 둘 다 비웁니다.

```
npm run configure
npm run deploy
```

자동 입력이 필요하면 ignored `.setup/install-input.json`에 아래 필드의 **실제 비밀이 아닌 설치 메타데이터**를 넣고 사용합니다. 개인 이메일·봇 토큰·키는 이 파일에 넣지 않습니다. 값은 아래 목록의 이름이고 미리 정해진 계정 값이 아닙니다.

- name: `threads-view-alerts` 또는 `threads-view-alerts-개인명`.
- accountId: 확인한 사용자의 Cloudflare Account ID.
- databaseName / databaseId: 방금 만든 전용 D1의 이름과 ID.
- teamDomain / aud: 첫 배포에서는 빈 문자열, Access 설정 후에는 실제 값.

```
node scripts/configure.mjs --input .setup/install-input.json
```

`deploy`는 명시적으로 개인 설정 파일을 사용합니다. 출력된 실제 Worker 주소를 기록하세요. 로그인 설정 전의 설치 미완료 응답은 정상입니다. 도메인·AUD·보관 키를 마치기 전까지 자동 확인은 시작되지 않습니다.

## 4. 이메일 인증과 최종 서버 설정

README 4단계대로 사용자의 Zero Trust 조직에 One-time PIN 로그인과 Self-hosted Access 앱을 만듭니다. 보호 호스트는 실제 본인 Worker의 전체 호스트입니다. 허용 이메일은 사용자 본인의 주소부터 설정합니다. 다른 사람을 초대하거나 Everyone 정책을 만들지 않습니다.

브라우저/계정 도구로 가능한 부분을 진행하고, 조직 가입·약관·본인 인증처럼 필요한 단계는 사용자에게 맡깁니다. 팀 도메인과 Application Audience AUD는 실제 대시보드에서 확인합니다. 추측하거나 JWT 검증을 없애서 문제를 해결하지 않습니다.

개인 설정을 실제 팀 도메인·AUD로 갱신한 뒤 최종 배포와 암호화 키 등록을 합니다.

```
npm run deploy
npm run secret:init
```

보관 키는 도우미가 생성·등록합니다. 원문을 채팅·로그에 출력하지 않고 `.setup/token-encryption-key.txt`는 사용자만 보관합니다. 원래 키 없이 기존 서버의 키를 바꾸지 않습니다.

## 5. 텔레그램: 사용자가 자신의 앱에서 입력

사용자가 배포된 주소에 이메일 PIN으로 로그인합니다. BotFather에서 개인 봇을 만들고 그 봇에게 `/start`를 보냅니다. 사용자는 배포된 앱의 비밀번호형 입력칸에 토큰을 직접 입력합니다. AI가 볼 수 있는 스크린샷과 로그에 토큰을 남기지 않습니다.

앱에서 **내 대화 ID 찾기 → 대화 선택 → 연결 저장 → 테스트 알림 보내기** 순서로 진행합니다. 실제 텔레그램 수신을 사용자에게 확인받습니다. 다른 봇 프로그램과 토큰이 충돌하면 README의 안내를 따르고, 기존 webhook이나 다른 서비스를 삭제하지 않습니다.

## 6. 조회수 확인과 완료 판정

사용자가 원하는 공개 계정/게시물, 기준 조회수, 확인 주기를 받습니다. 주기는 10·20·30·60분 중 선택하고 미지정이면 기본값 5,000회·30분입니다. 사용자당 10개 등록과 서버 확인량 제한이 있습니다.

등록 후 **지금 확인** 또는 예약 확인 결과를 관찰합니다. 실제 공개 조회수의 마지막 성공 시각과 오류 여부를 확인하세요. Threads가 정확한 공개 값을 주지 않으면 이전 값과 오류를 보존하는 것이 정상이며, 임의 숫자를 넣지 않습니다.

완료 보고에 아래 결과를 짧게 구분해서 적습니다.

1. 의존성·테스트 통과 여부.
2. 실제 배포 주소와 본인 계정·전용 DB 연결 확인 여부.
3. 본인 이메일 로그인 성공 여부.
4. 공개 게시물 조회수 수집 성공 여부 또는 실제 제한.
5. 테스트 알림의 Telegram 발송 응답과 실제 사용자 수신 확인 여부.
6. 예약 cron이 1분마다 실행되고 선택 주기를 사용하는지 확인 여부.

코드 검사가 통과했다는 이유만으로 타인의 계정에 배포됐다고 말하지 않습니다. 사용자가 아직 로그인/토큰 입력을 하지 않았다면 그 단계만 남았다고 설명하고, 가능한 독립 작업은 마칩니다.

배포 후 앱을 계속 켜둘 필요는 없습니다. 실행·저장 사용량은 사용자의 Cloudflare 계정에 귀속됩니다. 앱 실행에는 OpenAI/GPT/Meta API 키가 필요 없으며, AI와 나누는 설치·수정 대화의 사용량과 서버의 운영 사용량은 별개입니다.
