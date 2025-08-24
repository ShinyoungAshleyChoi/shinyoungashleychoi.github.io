---
layout: post
title: MCP로 AI에 내 헬스 데이터 연결하기! (기획 & 간단 설계)
tags: ["MCP", "vibe coding", "real-time"]
---

# MCP로 AI에 내 헬스 데이터 연결하기!

---

## **1. 프로젝트 개요**

- **프로젝트명**: Real-time Health Data MCP Server (AI Agent Query Focus)
- **배경 및 필요성**
    - 스마트폰과 웨어러블을 통한 개인 헬스 데이터 수집이 일상화되면서, **AI가 실시간으로 데이터에 접근하여 분석·피드백**을 주는 서비스 수요 증가.
    - 기존 헬스 데이터 분석은 배치 처리 중심이라, 즉각적인 사용자 질의응답에 제약이 있음.
- **목표**
    - iOS HealthKit과 MCP 서버를 연동해 실시간 헬스 데이터를 안전하게 수집하고, AI Agent가 대화 중에 바로 질의·응답할 수 있는 환경을 구축.

---

## **2. 주요 기능**

- 실시간 헬스 데이터 수집 (걸음수, 심박수, 수면, 운동)
- 이벤트 기반 증분 동기화 (Observer Query + Anchored Query)
- 안전한 데이터 전송 (HTTPS/mTLS, Token 인증)
- 원본 데이터 Parquet 저장 (일 단위 파티션)
- DuckDB 기반 빠른 질의 처리 (최근 데이터 위주)
- MCP Tools: getSteps, getWorkouts, getHeartRateStats
- MCP Resources: weekly_report.md(주간 리포트), 일간 요약 Parquet

---

## **3. 시스템 아키텍처**

![a tough Architecture](/img/posts/2025-08-11-design.png)

- **데이터 흐름**:
    
    iOS 브리지 앱 → HTTPS/mTLS 전송 → MCP 서버 → Parquet 저장 → DuckDB 질의 → MCP Tools/Resources → AI Agent
    
- **저장 구조**:
    - bronze/quantity_events/dt=YYYY-MM-DD/*.parquet
    - bronze/workouts/dt=YYYY-MM-DD/*.parquet
- **쿼리 처리 방식**:
    - 최근 30일 캐시(Parquet) → DuckDB → 응답
    - 범위 초과 시 직접 Parquet 스캔

---

## **4. 기술 스택**

- **클라이언트(iOS)**: Swift/SwiftUI, HealthKit API
- **서버**: Python + FastAPI, Node.js, @modelcontextprotocol/sdk
- **저장소**: Parquet (S3 또는 로컬), DuckDB
- **보안**: TLS/mTLS, Bearer Token 인증
- **기타**: Docker, GitHub Actions(CI/CD)

---

## **5. 데이터 모델**

- **Quantity 데이터**: 걸음수, 심박수 등 (value, unit, start_ts, end_ts, uuid)
- **Category 데이터**: 수면 분석, 활동 상태 등 (value, start_ts, end_ts, uuid)
- **Workout 데이터**: 운동 타입, 거리, 시간, 칼로리 등 (activity, distance, duration, energy)
- **메타데이터**: uuid, ingest_ts, device_id, dt 파티션

---

## **6. 보안 및 개인정보 보호 정책**

- HealthKit 권한 최소화 (필요 데이터 타입만 요청)
- 모든 전송 구간 TLS/mTLS 암호화
- Token 기반 인증 및 Rate Limit 적용
- 민감 데이터 로깅 금지
- 삭제 이벤트 수신 시 Parquet에서 삭제 반영

---

## **7. 활용 시나리오**

1. **AI 대화형 질의**: “지난 7일 걸음수 평균 보여줘” → MCP Tool 호출 → DuckDB 응답
2. **운동 분석**: “최근 러닝 워크아웃 요약해줘” → Parquet 필터링 후 결과 반환
3. **건강 리포트 자동 생성**: 주간 데이터 집계 후 weekly_report.md 생성

---

## **8. 프로젝트 일정**
![일정](/img/posts/2025-08-11-schedule.png)
---

## 9. 확장 방안

### **1. 데이터 레이어 확장 (Bronze → Silver → Gold)**

- **Bronze Layer (원본 저장)**
    - HealthKit에서 수집한 원본 데이터를 Parquet로 일 단위 파티션 저장
    - 중복/결측 포함, 원본 그대로 유지 → 재처리, 오류 복구 가능
- **Silver Layer (정제·표준화)**
    - Iceberg 테이블로 관리, 스키마 표준화, 단위 변환, 다중 기기 데이터 병합
    - ACID 트랜잭션 및 스냅샷 기능으로 데이터 정합성 확보
- **Gold Layer (집계·최종 분석)**
    - Airflow ETL로 주간/월간 통계 생성 (예: daily_steps, weekly_hr_stats)
    - AI Agent 및 대시보드가 즉시 사용할 수 있는 형태로 제공

### **2. 기술 확장**

- **배치 파이프라인 도입**
    - Apache Airflow + PySpark 기반 ETL로 실버/골드 테이블 갱신
    - 스케줄러를 통한 자동화 및 모니터링
- **장기 분석 지원**
    - Iceberg를 통한 수년치 데이터 관리 및 schema evolution 지원
    - 장기 추세 분석, 사용자 맞춤형 건강 코칭 모델 가능
- **실시간 + 배치 하이브리드**
    - 현재 실시간 MCP Tools 기반 질의에, 배치 기반 MCP Resources를 결합
    - 최신 데이터 + 누적 통계 모두 대응 가능
- **이상 감지 시 알림 기능 추가**
    - **규칙**: 절대 임계, 급상승, 급격 변화, 휴지기(쿨다운)
    - **채널**: APNs + 카톡 + Email(백업)
    - **운영**: 개인 임계값 학습, 오탐 감소 로직, 일시중지 토글