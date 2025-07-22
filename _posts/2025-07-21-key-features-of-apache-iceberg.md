---
layout: post
title: Understanding Apache Iceberg (2) - Key Features
tags: ["iceberg", "bigdata", "datalake"]
---

_이 글의 내용은 Apache Iceberg: The Definite Guide (O'Reilly)의 내용을 정리한 것 입니다._

# Apache Iceberg의 주요 특징

## ACID 트랜잭션
- ACID 보장을 위해 낙관적 동시성(optimistic concurrency) 적용
- 낙관적 동시성(optimistic concurrency)은 락(lock)의 최소화와 성능 향상을 위해 트랜잭션들이 서로 충돌하지 않음을 가정하며 필요할 때만 충돌을 확인한다. 커밋에 성공하거나 실패하거나 둘 중 한가지 상태만 존재한다.
- 비관적 동시성(pessimistic concurrency)모델에서는 충돌이 일어날 것을 가정하여 트랜잭션 간 충돌을 방지하기 위한 락을 사용한다. 이는 현 시점에서는 Apache Iceberg에 적용 불가능하나 추후에는 가능할 수도 있다.
- 동시성 보장은 카탈로그(catalog - (3) Architecture 편에서 자세히)가 다룬다.

## 파티션 진화 (Partition evolution)
- Apache Iceberg 이전의 데이터 레이크 환경에서의 큰 골칫거리 중 하나는 태이블의 물리적 최적화 변경
- 파티셔닝을 변경해야 할 때 선택 가능한 유일한 방법은 전체 테이블을 다시 쓰는 것, 아니면 현재 파티셔닝을 유지하면서 잠재적 성능 향상을 희생하는 것이었음
- Apache Iceberg에서는 파티셔닝 변경을 위해 메타데이터만 수정되면 되므로 테이블과 전체 데이터를 다시 쓰지 않고 언제든 파티셔닝을 업데이트 할 수 있음
- 아래 그림에서, 파티셔닝은 처음에는 month를 기준으로 되었다가 day기준으로 변경됨, 이전 파티셔닝과 변경된 파티셔닝이 적용된 데이터를 모두 가져올 때 파티셔닝 방식에 따라 실행계획이 분리됨

  | ![Partition evolution](/img/posts/2025-07-21-key-features-of-apache-iceberg-1.png) |
  |:----------------------------------------------------------------------------------:|
  |                                       그림1[^]                                       |

## 숨겨진 파티셔닝 (Hidden Partitioning)
- Hive나 전통적인 시스템에서는 timestamp 컬럼으로 파티셔닝 하면, 내부적으로는 event_year, event_month, event_day같은 식으로 다른 컬럼들이 생성되어 파티셔닝됨
- `event_timestamp >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)`
- Hive에서 최근 90일간의 평균 수익을 얻기 위해 위와 같은 필터링을 한다면, event_year, event_month, event_day를 직접 필터링하는게 아니기 때문에 전체 스캔을 하게 됨 
- 하지만 Apache Iceberg에서는 파티셔닝 컬럼을 직접 쿼리할 필요가 없도록 내부에서 자동으로 처리해줌

## 행 기반 테이블 운영 (Row-level table operations)
- Apache Iceberg에서는 행 단위 업데이트를 copy-on-write(COW) 혹은 merge-on-read(MOR) 방식으로 처리
- Copy-on-write(COW): 한 행이라도 변경 발생시 전체 파일을 새로 씀
- Merge-on-read(MOR)
  - 변경된 행들만 새로운 파일에 저장해두고 읽을 때 최신상태로 합쳐서 보여줌
  - 무거운 수정&삭제 작업을 가볍게 처리 가능

## 타임 트래블
- Apache Iceberg는 불변 스냅샷을 제공하여 테이블의 히스토리컬 상태에 접근 가능하며 과거 시점을 기준으로 쿼리를 실행할 수 있음

## 버전 롤백
- 물론 과거 시점의 데이터에 접근하는 것 뿐만 아니라 해당 시점의 스냅샷으로 테이블을 되돌릴 수도 있음

## 스키마 진화 (Schema evolution)
- 컬럼 추가/삭제, 컬럼 이름 변경, 컬럼 데이터 타입 변경등이 가능


[^1]: https://www.dremio.com/blog/future-proof-partitioning-and-fewer-table-rewrites-with-apache-iceberg/



