---
layout: post
title: Apache Iceberg 이해하기!
tags: ["iceberg", "data", "database", "architecture"]
---
# Apache Iceberg 소개
Apache Iceberg는 2018년 Netflix에서 Hive의 한계를 극복하기 위해 개발하였습니다.<br/>

### 기존 Hive 테이블의 한계란 다음과 같습니다.

- 정확성(Correctness)
  - ACID를 지원하지 않음
  - 테이블 업데이트 시 동시 쓰기나 실패가 발생할 경우 쿼리 결과가 손상되거나 테이블 자체가 손상될 가능성
- 성능 및 확장성(Performance and scale)
  - 데이터 파일을 찾기 위해 디렉터리를 나열하는 방식 -> 속도 느림
  - 파티션 디렉터리 내에서 파일을 필터링하는 데 필요한 메타데이터가 부족
- 비용 문제 (Costly distractions)
  - 정기적인 스키마 진화(schema evolution)로 인해 테이블 데이터가 손상되고, 이러한 문제가 다운스트림까지 전파됨
  - 작성자는 데이터 파일 크기를 신경 써야 했고, 읽는 쪽에서도 테이블의 물리적 레이아웃을 이해해야 효율적인 쿼리를 구성할 수 있음


### Hive와 대비되는 Iceberg의 특징은 아래와 같습니다.

- 스키마 진화(Schema evolution): 컬럼 추가, 삭제, 수정, 이름 변경을 지원하며, 부작용이 없음
- 숨겨진 파티셔닝(Hidden partitioning): 사용자의 실수로 인해 잘못된 결과가 나오거나 쿼리가 지나치게 느려지는 것을 방지
- 파티션 레이아웃 진화(Partition layout evolution): 데이터 볼륨 또는 쿼리 패턴 변화에 따라 테이블의 레이아웃을 업데이트 가능
- 타임 트래블(Time travel): 동일한 테이블 스냅샷을 사용한 재현 가능한 쿼리를 실행하거나, 데이터 변경 내역을 쉽게 확인 가능
- 버전 롤백(Version rollback): 테이블을 정상 상태로 빠르게 복원하여 문제를 신속하게 해결 가능
- 빠른 스캔 계획(Scan planning): 분산 SQL 엔진 없이도 테이블을 읽거나 파일을 찾을 수 있음
- 고급 필터링(Advanced filtering): 테이블 메타데이터를 활용하여 파티션 및 컬럼 수준 통계를 기반으로 데이터 파일을 효율적으로 제외(prune)
- 결과적 일관성 클라우드 스토리지의 정확성 문제 해결
- 모든 클라우드 스토리지와 호환되며, HDFS에서는 파일 목록 조회와 이름 변경을 피함으로써 네임노드(NN) 혼잡 감소
- 직렬화 격리(Serializable isolation): 테이블 변경이 원자적으로 수행되며, 읽기 작업 중 부분적으로 커밋되지 않은 변경 사항을 보지 않음
- 동시 쓰기 지원(Multiple concurrent writers): 낙관적 동시성 제어(optimistic concurrency)를 사용하여 충돌 발생 시 재시도하며, 호환 가능한 업데이트가 성공하도록 보장

iceberg는 data warehouse나 datalake를 위해 디자인 되어 페타바이트 단위의 데이터를 다룰 수 있고 고성능과 신뢰성, 그리고 사용하기 쉽다는 장점이 있어요.<br/>
특히 중요한 부분은 스키마, 파티션 정보, 스냅샷 등과 같은 메타 정보를 추적할 수 있다는 점이에요.<br/>
테이블을 수정하면 그것을 위한 메타데이터 파일이 만들어집니다.<br/>
<br/>
덕분에 위에 말했던 타입 트래블이나 버전 롤백이 가능해요!<br/>
<br/>
iceberg 테이블의 아키텍쳐를 그림으로 표현하면 아래와 같습니다.<br/>
이 구조를 통해 쿼리 성능을 개선시키고 효율적인 메타 데이터 관리를 가능하게 하며, ACID를 지원하고 대규모 분석 환경을 만들 수 있어요.<br/>
예를 들어 table1이란 테이블을 생성시키면 최초로 s0 버전의 메타데이터 파일과 menifest 파일이 생길거에요.<br/>
이 경우 아직 데이터는 없으니까 맨 마지막 데이터 파일은 아직 만들어지지 않았겠죠.<br/>
그 후에 테이블을에 인서트를 하거나 업데이트를하면 s1버전의 스냅샷이 새로 생기고 테이블은 최종적으로 s1의 메타정보를 바라봅니다.

![2025-02-01-iceberg-architecture.png](..%2Fimg%2F2025-02-01-iceberg-architecture.png)

오늘은 일단 여기까지.. 다음에 좀더 자세하게 iceberg를 파헤쳐볼게요.


[References]
- <https://www.tabular.io/apache-iceberg-cookbook/introduction-from-the-original-creators-of-iceberg/>
- <https://iceberg.apache.org/docs/nightly/#user-experience>
- <https://www.youtube.com/watch?v=xfAYLAFCLvM>
