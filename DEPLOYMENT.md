# 제주외고 분실물 센터 운영 배포 안내

이 프로젝트는 학생용 React 웹과 Express API, Replit 관리형 PostgreSQL, Replit Object Storage로 구성되어 있습니다. 학생용 웹과 `/api` 경로는 아티팩트 라우팅을 통해 같은 공개 도메인에서 제공됩니다.

## 영구 저장 구조

- 분실물 정보: PostgreSQL의 `lost_items` 테이블
- 관리자 세션: PostgreSQL의 `sessions` 테이블
- 관리자 계정: PostgreSQL의 `admin_accounts` 테이블
- 이미지 파일: Replit Object Storage
- `lost_items.image_url`: 이미지 바이트가 아니라 `/objects/...` 오브젝트 경로만 저장

기존 레코드의 데이터 URL이나 외부 이미지 URL은 그대로 표시할 수 있습니다. 새 이미지는 Object Storage에 저장하고, 확인된 오브젝트 경로만 데이터베이스에 기록합니다. 웹 서버를 재시작하거나 새 배포를 만들어도 분실물 데이터와 사진 바이트는 서버 로컬 파일에 의존하지 않습니다.

## 이미지 업로드 기준

- 원본 최대 크기: 50MB, 최대 해상도 8천만 픽셀
- 지원 입력: JPEG, PNG, WebP 및 브라우저가 디코딩할 수 있는 HEIC/HEIF
- 원본 바이트의 실제 형식을 확인한 다음 EXIF 방향을 적용해 긴 변 2,000px 이하로 줄입니다.
- 브라우저는 JPEG 품질 90%, 86%, 82%, 78% 순서로 시도하고, 필요하면 긴 변을 1,800px, 1,600px로 줄입니다.
- 서버가 이미지 바이트를 다시 디코딩하고 EXIF 방향을 적용해 JPEG로 정규화합니다. 저장 품질은 88%, 84%, 80% 순서이며, 긴 변은 최대 2,000px, 1,800px, 1,600px입니다.
- 저장되는 최종 파일은 JPEG, 최대 8MB입니다. 브라우저 업로드 완료 응답만으로 저장 성공 처리하지 않고, 서버가 Object Storage에서 파일을 다시 읽어 확인한 후 DB에 연결합니다.
- 투명 PNG는 흰색 배경으로 합성합니다. 빈 파일, 손상된 이미지, 지원하지 않는 형식, 용량/픽셀 제한 초과는 관리자 화면에 오류로 표시합니다.

HEIC 지원 여부는 기기의 브라우저 이미지 디코더에 따라 달라집니다. 디코딩을 지원하지 않는 브라우저에서는 JPEG로 변환하거나 기기의 카메라 포맷을 호환성 우선으로 바꿔야 합니다.

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
- `VITE_API_BASE_URL`: 프론트엔드 빌드 시 API origin을 별도로 지정할 때 사용합니다. 예: `https://api.example.com` (끝의 `/api`는 붙이지 않음). API의 `ALLOWED_ORIGINS`에는 프론트엔드의 정확한 origin을 넣습니다. 별도 도메인 인증을 위해 쿠키는 `Secure; SameSite=None`으로 발급됩니다.

서로 다른 사이트의 API 쿠키는 브라우저의 서드파티 쿠키 제한에 걸릴 수 있습니다. 가능하면 같은 상위 도메인, 사용자 지정 도메인 또는 프록시를 사용해 API를 같은 사이트로 제공하세요.

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

Vercel처럼 웹과 API가 분리된 외부 배포를 선택할 경우에도 PostgreSQL과 Object Storage는 반드시 외부 영속 서비스로 연결해야 합니다. `VITE_API_BASE_URL`은 프론트엔드 API 주소를 설정하지만, 현재 API의 서명 URL 발급은 Replit Object Storage 사이드카(`127.0.0.1:1106`)를 사용합니다. 따라서 Replit Object Storage 경로는 외부 Vercel API에서 그대로 작동하지 않습니다. 완전한 Vercel 이전에는 이 서명 계층을 S3 호환 등 외부 영속 스토리지 어댑터로 교체하고, 세션과 DB도 외부 배포에서 접근 가능한 영속 서비스로 설정해야 합니다.