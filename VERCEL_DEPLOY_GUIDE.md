# Vercel 배포 가이드

이 프로젝트는 Vercel을 사용하여 프론트엔드와 백엔드를 통합 배포하도록 최적화되었습니다.

## 🚀 배포 단계

### 1. 준비 사항
- GitHub 계정 및 Vercel 계정.
- 프로젝트 코드를 GitHub 저장소에 푸시해야 합니다.

### 2. Vercel 프로젝트 생성
1. [Vercel Dashboard](https://vercel.com/dashboard)로 이동합니다.
2. **[Add New]** -> **[Project]** 클릭.
3. 이미지 합성기 저장소를 **[Import]** 합니다.

### 3. 환경 변수 설정 (중요)
배포 설정 화면의 **Environment Variables** 섹션에서 다음 항목을 반드시 추가하세요:
- `UNSPLASH_ACCESS_KEY`: Unsplash API Access Key.
- `LOGIN_ID`: (사용할 아이디 이메일 입력)
- `LOGIN_PW`: (사용할 비밀번호 입력)

### 4. 배포 및 도메인 연결
1. **[Deploy]** 버튼을 클릭합니다. (약 1~2분 소요)
2. 배포 완료 후 **[Settings]** -> **[Domains]** 메뉴로 이동합니다.
3. `ipa.schemade.com`을 입력하고 추가합니다.
4. Vercel이 제공하는 **CNAME 값**을 호스팅KR(또는 Route 53)의 DNS 설정에 등록합니다.

## 🛠 로컬 개발
Vercel 환경을 로컬에서 테스트하려면 `vercel dev` 명령어를 사용할 수 있습니다.
```bash
npm i -g vercel
vercel dev
```

## ❓ FAQ
- **이미지 업로드 에러:** 환경 변수가 정확히 입력되었는지 확인하세요.
- **Sharp 에러:** Vercel은 리눅스 기반이므로 자동으로 적절한 바이너리를 설치합니다.
