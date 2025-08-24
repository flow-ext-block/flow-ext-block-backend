# 파일 확장자 차단 관리 시스템

> **마드라스체크 채용 과제**

---

## 1. 프로젝트 개요

웹 서비스에서 사용자 파일 업로드는 흔하지만, `.exe`, `.sh`, `.bat` 같은 실행 파일은 서버에서 임의 코드 실행이나 권한 상승을 유발할 수 있는 심각한 보안 위험을 가지고 있습니다.
이를 예방하기 위해, 관리자가 확장자 차단 정책을 쉽게 설정·관리할 수 있는 **확장자 기반 파일 업로드 차단 관리 시스템**을 구현했습니다.  
고정 확장자(Fixed)와 커스텀 확장자(Custom)를 구분하여 관리할 수 있도록 설계해, 보안성을 확보하면서도 운영 환경에서의 유연성을 보장했습니다.

## 2. 기술 스택 및 선택 이유

### **Frontend**

- **React + Vite**  
  빠른 빌드 속도와 모듈 기반 컴포넌트 아키텍처를 활용해 생산성과 유지보수성을 높였습니다.
- **React Query**  
  서버 상태 관리와 캐싱, 낙관적 업데이트를 통합적으로 처리해 사용자 경험을 개선했습니다.
- **Zod**  
  입력값을 프런트에서 즉시 검증하고 서버와 동일한 규칙을 공유해 보안성을 강화했습니다.
- **Tailwind + shadcn/ui**  
  빠른 스타일링과 일관성 있는 UI 컴포넌트 사용을 통해 직관적인 관리자 화면을 구축했습니다.
- **Replit AI** _(보조 도구)_  
  **초기 화면 설계 및 디자인 가이드 초안**을 잡는 데 Replit의 AI 기능을 적극 활용했습니다.  
  **컴포넌트 구조 설계**와 **UI 스타일 아이디어**를 도출하는 데 도움을 받아 개발 초기 설계 시간을 단축했습니다.

### **Backend**

- **NestJS**  
  모듈형 아키텍처와 강력한 DI(Dependency Injection) 지원을 통해 기능 단위 확장성과 유지보수성을 확보했습니다.
- **TypeORM**  
  소프트 삭제, 조건부 유니크 인덱스, 동시성 제어 등 고급 쿼리 로직을 효율적으로 구현할 수 있었습니다.

### **Database**

- **PostgreSQL**  
  부분 유니크 인덱스를 활용해 활성 상태 데이터만 유니크 제약을 적용할 수 있었고, 소프트 삭제 전략과 잘 맞아 안정성을 높였습니다.

### **Infra**

- **S3 + CloudFront**  
  정적 자산은 S3에, 배포·캐싱·TLS는 CloudFront로 분리했습니다.  
  전 세계 엣지 캐시로 초기 로드 시간을 줄이고, 정적 리소스(`.js/.css`)는 파일명 해시 기반으로 `immutable, max-age=31536000` 정책을 적용했습니다. 반면 신규 배포를 즉시 반영할 수 있도록 `index.html`은 **no-cache**로 설정했습니다.
  - **도메인 & TLS**: Route 53 + ACM(CloudFront용)으로 커스텀 도메인과 HTTPS 종단을 구성.
  - **원본 보호**: CloudFront **OAC/OAI**로 S3 버킷에 직접 접근을 막고, 오직 CDN을 통해서만 제공.
  - **무중단 갱신**: 배포 후 CloudFront **부분 무효화**(주로 `index.html`)로 최신 상태를 보장하면서 캐시 이점을 유지.

- **Docker (Compose)**  
  백엔드를 컨테이너화한 이유는 **환경 불일치를 없애고, 재현 가능한 빌드와 신속한 롤백 등 다양한 이점들이 있기 때문입니다**.
  - **환경 일치**: 로컬/스테이징/프로덕션이 동일한 이미지로 동작 → “내 PC만 되는” 문제가 해결.
  - **의존성 격리**: Node/Nest, 시스템 패키지 버전을 이미지에 고정 → 런타임 변동 리스크 감소.
  - **운영 단순화**: `docker compose pull && docker compose up -d` 만으로 컨테이너 간단 배포.

- **GitHub Actions**  
  GitHub Actions 를 이용해 **푸시 후 빌드 및 배포** 자동화를 진행했습니다.
  프론트·백엔드 파이프라인을 분리해 실패 격리를 확보하고, 배포는 **부분 무효화 + 컨테이너 배포**로 진행했습니다.
  - **Frontend 파이프라인**
    1. `npm ci && npm run build`
    2. 빌드 산출물 **S3 동기화**
    3. `index.html` **CloudFront 무효화**(나머지 정적 리소스는 해시로 캐시 유지)
  - **Backend 파이프라인**
    1. Docker 이미지 **빌드 & 태깅**
    2. 레지스트리(GHCR/Docker Hub) **푸시**
    3. 배포 서버로 SSH → docker compose pull && docker compose up -d 를 통해 컨테이너 배포.

---

## 3. 엔티티

### 1) `extensions` 테이블입니다.

| 컬럼명      | 타입(DB)                 | NULL | 기본값  | 설명/비고                                                              |
| ----------- | ------------------------ | ---- | ------- | ---------------------------------------------------------------------- |
| `id`        | `serial` (PK)            | NO   | —       | 고유 ID입니다.                                                         |
| `ext`       | `varchar(20)`            | NO   | —       | 확장자 문자열입니다(소문자/숫자 및 **중간 점 허용**).                  |
| `type`      | `enum('FIXED','CUSTOM')` | NO   | —       | 고정/커스텀 구분입니다.                                                |
| `blocked`   | `boolean`                | NO   | `false` | 차단 여부입니다(커스텀 추가 시 서비스 레이어에서 `true`로 저장합니다). |
| `activeAt`  | `timestamptz`            | NO   | `now()` | 정렬/복구 시점용입니다(복구 시 `now()`로 갱신합니다).                  |
| `createdAt` | `timestamptz`            | NO   | `now()` | 생성 시각입니다.                                                       |
| `updatedAt` | `timestamptz`            | NO   | `now()` | 갱신 시각입니다.                                                       |
| `deletedAt` | `timestamptz`            | YES  | `NULL`  | 소프트 삭제 시각입니다(삭제 시 `now()`로 세팅합니다).                  |

#### 인덱스/제약 요약입니다.

| 이름                          | 대상 컬럼       | 조건(Partial)                             | 유형            | 목적                                                                                |
| ----------------------------- | --------------- | ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `uniq_extensions_ext_active`  | `ext`           | `"deletedAt" IS NULL`                     | **부분 유니크** | 활성 행만 유니크 보장입니다. 소프트 삭제 후 동일 `ext` 재삽입/복구를 허용합니다.    |
| `idx_ext_custom_active_order` | `activeAt, id`  | `"type"='CUSTOM' AND "deletedAt" IS NULL` | **부분 복합**   | 커스텀 목록 조회(정렬 `activeAt ASC, id ASC`)와 **전체 삭제 스캔**을 빠르게 합니다. |
| `idx_ext_fixed_active_order`  | `createdAt, id` | `"type"='FIXED' AND "deletedAt" IS NULL`  | **부분 복합**   | 고정 목록 조회(정렬 `createdAt ASC, id ASC`)를 최적화합니다.                        |

---

### 2) `extension_settings` 테이블입니다.

| 컬럼명        | 타입(DB)      | NULL | 기본값  | 설명/비고                            |
| ------------- | ------------- | ---- | ------- | ------------------------------------ |
| `id`          | `int` (PK)    | NO   | —       | 싱글톤 키입니다(예: `1` 고정입니다). |
| `customLimit` | `int`         | NO   | `200`   | 커스텀 확장자 최대 개수입니다.       |
| `createdAt`   | `timestamptz` | NO   | `now()` | 생성 시각입니다.                     |
| `updatedAt`   | `timestamptz` | NO   | `now()` | 갱신 시각입니다.                     |

---

### 3) `ExtensionType` enum입니다.

| 값       | 의미                             |
| -------- | -------------------------------- |
| `FIXED`  | 사전 정의 고정 확장자입니다.     |
| `CUSTOM` | 사용자 등록 커스텀 확장자입니다. |

---

## 4. API 설계 및 주요 고려사항

### **3.1 고정 확장자(Fixed)**

#### ① 고정 확장자 목록 조회.

> **Endpoint**: GET /api/extensions/fixed

- **설명**: 사전 정의된 고정 확장자 목록과 차단 상태를 조회.
- **주요 로직**:
  - 단일 엔티티를 type 컬럼을 통해 고정 확장자와 커스텀 확장자로 구분하였기 때문에 조회 조건은 type='FIXED'입니다.
  - 정렬은 생성 순인 createdAt ASC 로 설정하였습니다.
  - 차단 상태도 반영해줘하기 때문에 응답 항목은 {id, ext, blocked}입니다.

**성공 응답 예시**

```json
{
  "items": [
    { "id": 1, "ext": "exe", "blocked": true },
    { "id": 2, "ext": "bat", "blocked": false }
  ],
  "updatedAt": "2025-08-24T09:00:00Z"
}
```

---

#### ② 고정 확장자 차단 상태 토글

> **Endpoint**: `PATCH /api/extensions/fixed/:id`

- **설명**: 특정 고정 확장자의 blocked 값을 갱신.
- **주요 로직**:
  - repository.update({ id, type: ExtensionType.FIXED }, { blocked })로 부분 업데이트를 수행합니다(엔티티 로딩 없이 즉시 UPDATE 쿼리 실행).
  - result.affected === 0 이면 NotFoundException을 던져 404 NOT_FOUND를 반환합니다(id 또는 type 불일치인 경우).

---

### **3.2 커스텀 확장자(Custom)**

#### ① 커스텀 확장자 목록 조회

> **Endpoint**: `GET /api/extensions/custom`

- **설명**: 커스텀 확장자 목록과 현재 등록 개수 및 한도를 반환.
- **주요 로직**:
  - **병렬 조회**로 지연 시간을 단축합니다. 확장자 목록과 설정(`extension_settings`)을 `Promise.all`로 동시에 조회합니다.
  - 목록 조회는 `where: { type: CUSTOM }`로 수행하며, **정렬은 `activeAt ASC, id ASC`** 입니다. 복구나 정렬 재배치 시 `activeAt`을 갱신해 **리스트 맨 뒤 배치**를 보장합니다.
  - 전송 효율을 위해 `select: ['id','ext']`로 **필요 필드만 선택**합니다.
  - 설정 행이 없을 경우 **기본값으로 생성**한 뒤, `limit`을 `settings.customLimit ?? DEFAULT_CUSTOM_LIMIT`로 반환합니다.
  - 소프트 삭제 된 데이터는 **TypeORM의 `DeleteDateColumn`을 사용 중이기 떄문에 기본적으로 자동 제외**됩니다.
  - 응답은 `{ items, count: items.length, limit }` 형태로 반환합니다. 한도는 **DB 설정값**을 그대로 반영합니다.

- **성공 응답 예시**

```json
{
  "items": [
    { "id": 101, "ext": "pdf" },
    { "id": 102, "ext": "docx" }
  ],
  "count": 2,
  "limit": 200
}
```

---

#### ② 커스텀 확장자 추가

> **Endpoint**: `POST /api/extensions/custom`

- **설명**: 신규 커스텀 확장자를 추가
- **주요 로직**:
  - 정규화·검증을 먼저 수행합니다. normalizeExt로 trim → 선행점 여러개 제거 → 소문자화를 거친 뒤 ** 중간 점 허용 + 총 길이 1-20자** 정규식을 통과하지 못하면 즉시 400 BadRequest를 반환합니다. 잘못된 입력이 DB에 진입하지 못하도록 앞단에 차단하도록 설계했습니다.

  - 트랜잭션으로 한도 검사를 보호합니다. manager.transaction 내부에서 처리하며, extension_settings는 pessimistic_write 잠금으로 읽기/생성을 직렬화합니다. 레이스 컨티션에서도 customLimit 을 넘어가지 않도록 설계했습니다.

  - 활성 커스텀 확장자 수만 집계해 한도를 비교합니다. count(CUSTOM) 결과가 customLimit 이상이면 즉시 에러를 반환하도록 설계했습니다.

  - 커스텀 확장자 추가 시 해당 확장자의 데이터가 소프트 삭제 된 이력이 있으면 ‘복구’로 처리합니다. withDeleted: true로 최근 삭제 레코드를 찾으면 restore 후 type=CUSTOM, blocked=true, activeAt=NOW()로 갱신합니다. 같은 ID를 재사용해 일관성을 지키고, activeAt 갱신으로 반환 리스트에서는 맨 뒤에 배치 되도록 했습니다.

  - 새로운 데이터 추가 시 유니크에 존재하지 않으면 **insertExtensionUniqueOrThrow** 함수에서 INSERT ... ON CONFLICT DO NOTHING을 통해 중복 시 에러 없이 “영향 0”으로 중복 사유 판별하고 409 DUPLICATE_IN_FIXED 또는 409 DUPLICATE_IN_CUSTOM으로 매핑합니다. 동시에 같은 값이 들어와도 DB가 하나만 승인하고 나머지는 영향 0으로 처리하므로, 레이스 컨디션에서 안전하도록 설계했습니다.

---

#### ③ 커스텀 확장자 단일 삭제

> **Endpoint**: `DELETE /api/extensions/custom/:id`

- **설명**: 커스텀 확장자 단건 삭제
- **주요 로직**
  - `repository.softDelete({ id, type: CUSTOM })`로 즉시 **부분 업데이트**를 수행해 `deletedAt`을 현재 시각으로 설정합니다. 엔티티 로딩 없이 한 번의 `UPDATE`로 처리하는 설계입니다.
  - `type` 조건을 함께 걸어 **고정(FIXED) 레코드가 잘못 삭제되는 상황을 방지**합니다.
  - 결과의 `affected === 0`이면 `id` 또는 `type`이 일치하는 행이 없어 **`404 NotFound`**를 던집니다.
  - 이미 삭제된 행이라도 `softDelete`는 `deletedAt`을 갱신하므로 일반적으로 `affected`가 1 이상이 되어 **멱등적으로 동작**합니다.

#### ④ 커스텀 확장자 전체 삭제

> **Endpoint**: `DELETE /api/extensions/custom`

- **설명**: 커스텀 확장자 전체 삭제 API
- **주요 로직입니다.**
  - `manager.transaction` 경계에서 실행하여 작업 원자성을 보장합니다.
  - QueryBuilder의 `softDelete().from(Extension)`에  
    `WHERE type='CUSTOM' AND deletedAt IS NULL` 조건을 적용해 **활성 레코드만** 삭제합니다.  
    (고정(FIXED) 항목은 영향받지 않습니다.)
  - 이미 삭제된 항목은 조건에 걸리지 않아 **멱등적으로** 동작합니다.
  - 대량 처리 성능을 위해 `(type, deletedAt)` **복합 인덱스**를 설정하였습니다.

## 5. 핵심 설계 포인트

- **동시성 제어**: `INSERT ... ON CONFLICT DO NOTHING`으로 중복 삽입 방지
- **소프트 삭제 전략**: `deletedAt` 필드를 사용해 실수 복구 가능
- **조건부 유니크 인덱스**: 활성 데이터만 값에 대한 유니크를 보장하여 관리 편의성 확보
- **에러 처리 고도화**: 상세 코드(`DUPLICATE_IN_*`) 기반으로 사용자 친화적 에러 메시지 제공

---

## 6. 테스트 시나리오

| 시나리오                              | 예상 동작                           |
| ------------------------------------- | ----------------------------------- |
| `.exe` 고정 확장자 차단 후 새로고침   | `blocked=true` 유지                 |
| `sh` 커스텀 추가 → 동일 확장자 재추가 | `409 DUPLICATE_IN_CUSTOM` 응답      |
| `pdf` 커스텀 삭제 후 재추가           | 정상 추가 가능                      |
| `zip` 확장자 동시 2회 추가            | 1건만 추가, 나머지는 `409 Conflict` |

---

## 7. 마무리

해당 과제는 **여러 관리자 계정의 동시 작업**을 전제로 설계했습니다.
중복 추가/삭제 경쟁에 대해서는 **DB 유니크 제약 + `ON CONFLICT DO NOTHING`**으로 일관성을 보장하고, **설정 행(customLimit)**은 트랜잭션과 **비관적 락**으로 보호했습니다. 또한, 커스텀 삭제는 **소프트 삭제**를 채택했습니다.이유는 ① 운영자가 실수로 지운 항목을 **즉시 복구**할 수 있고, ② `deletedAt IS NULL`에만 유니크를 적용해 **활성 레코드만 중복 제어**가 가능하며, ③ **이력/감사**를 남겨 변경 추적이 용이할 수 있기 때문에 여러가지 확장성을 고려하여 소프트 삭제를 선택하였습니다.
화면 호출과 배포는 **S3 + CloudFront**(정적 호스팅·TLS·캐싱), **Docker**(환경 일치/재현 가능 빌드), **GitHub Actions**(빌드→테스트→배포 자동화)로 구성하여 완성도를 높이고자 했습니다.
