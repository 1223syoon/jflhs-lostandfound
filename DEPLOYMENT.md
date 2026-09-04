# 제주외고 분실물 센터 운영 배포 안내

이 프로젝트는 학생용 React 웹과 Express API, Replit 관리형 PostgreSQL, Replit Object Storage로 구성되어 있습니다. 학생용 웹과 `/api` 경로는 아티팩트 라우팅을 통해 같은 공개 도메인에서 제공됩니다.

## 영구 저장 구조

- 분실물 정보: PostgreSQL의 `lost_items` 테이블
- 관리자 세션: PostgreSQL의 `sessions` 테이블
- 관리자 계정: PostgreSQL의 `admin_accounts` 테이블
- 이미지 파일: Replit Object Storage
- `lost_items.image_url`: 이미지 바이트가 아니라 `/objects/...` 오브젝트 경로만 저장

따라서 웹 서버가 재시작되거나 새 배포가 만들어져도 분실물 데이터와 이미지가 서버 로컬 파일에 의존하지 않습니다.

## 필요한 환경변수

### Replit이 자동으로 제공하는 값

- `DATABASE_URL`: 관리형 PostgreSQL 연결 정보
- `PORT`: 각 아티팩트의 서비스 포트
- `BASE_PATH`: 웹 아티팩트의 기본 경로

### 관리자 설정

- `ADMIN_EMAIL`: 관리자 로그인 이메일
- `ADMIN_PASSWORD`: 관리자 로그인 비밀번호. 반드시 Replit Secrets에 저장

### Object Storage 설정

Object Storage를 한 번 프로비저닝하면 다음 값이 생성됩니다.

- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
- `PRIVATE_OBJECT_DIR`
- `PUBLIC_OBJECT_SEARCH_PATHS`

이미지 업로드는 관리자 인증 후 서명된 업로드 URL을 발급하고, 브라우저가 Object Storage에 직접 업로드합니다. API와 PostgreSQL에는 이미지 파일 자체를 보내지 않습니다.

### 선택 설정

- `ALLOWED_ORIGINS`: API를 별도 도메인에서 호출해야 할 때 쉼표로 구분한 허용 origin 목록. 같은 공개 도메인의 `/api` 경로를 사용하는 현재 배포 방식에서는 비워 두어도 됩니다.

## 개발 실행

관리형 워크플로를 사용하면 `PORT`와 `BASE_PATH`가 자동으로 주입됩니다.

```text
artifacts/api-server: API Server
artifacts/jeju-lost-and-found: web
```

개발 데이터베이스 스키마는 Drizzle로 관리하며, 스키마 변경을 게시할 때는 Replit Publish 화면의 개발→프로덕션 스키마 변경 확인 절차를 사용합니다.

## 게시

1. 개발 환경에서 관리자 로그인과 분실물 CRUD를 확인합니다.
2. Replit Publishing에서 공개 배포를 선택합니다.
3. 첫 게시 전에 데이터베이스와 Object Storage가 같은 운영 지역에 배치되는지 확인합니다. 게시 지역은 첫 게시 후 변경할 수 없습니다.
4. 게시가 완료되면 Replit이 고정된 `*.replit.app` URL을 제공합니다.
5. 필요하면 Publishing의 도메인 설정에서 학교가 소유한 사용자 지정 도메인을 연결합니다.

Vercel처럼 웹과 API가 분리된 외부 배포를 선택할 경우에도 PostgreSQL과 Object Storage는 반드시 외부 영속 서비스로 연결해야 합니다. 현재 코드는 Replit의 관리형 배포와 Object Storage를 기준으로 구성되어 있으며, Replit 게시에서는 별도의 파일 시스템이나 임시 배열을 사용하지 않습니다.