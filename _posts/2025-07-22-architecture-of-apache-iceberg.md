---
layout: post
title: Understanding Apache Iceberg (3) - Architecture
tags: ["iceberg", "bigdata", "datalake"]
---

_이 글의 내용은 Apache Iceberg: The Definite Guide (O'Reilly)의 내용을 정리한 것 입니다._

# Apache Iceberg의 아키텍쳐

## 데이터 레이어(The Data Layer)
- 테이블의 실제 데이터를 저장하며 삭제 파일을 포함
- 데이터 레이어 의 파일은 Apache Iceberg 테이블의 트리 구조의 리프 노드들로 구성되어 있음
- 분산 파일 시스템 기반 (HDFS, Amazon S3, ADLS, GCS, ...)

### 데이터 파일(Datafiles)
- 말 그대로 실제 데이터를 저장하는 파일
- 여러 가지 파일 포맷을 지원, 내장 기능으로는 Apache Parquet, Apache ORC, Apache Avro를 지원
  - 필요에 따라 적합한 파일 포맷을 이용하면 됨 (eg. 대규모 OLAP 분석 - parquet, 스트리밍 분석 테이블 - avro)
  - 필요에 의해 파일 포맷이 변경되어 여러 파일 포맷이 혼재되어도 그대로 사용 가능
  - 새로운 개선된 파일 포맷이 개발된다면 이를 적용할 수도 있음
- 여러 파일 포맷을 지원하지만 사실상 표준이 되는 것은 parquet 형식임
  - 이는 컬럼 기반 구조가 행 기반 구조보다 대규모 OLAP에 적합하기 떄문
  - 그 밖에, 하나의 파일을 여러 방식으로 분할해서 병렬성을 높일 수 있음
  - 각 분할 지점에 대한 통계 정보를 가질 수 있어서 필터 푸쉬다운이나 스킵리드가 가능
  - 압축 효율이 좋아서 저장 공간을 적게 차지하고 읽기 속도가 높아지는 이점이 있음

#### Parquet 파일의 내부 구조

  | ![The architecture of a Parquet file](/img/posts/2025-07-22-figure1.png) |
  |:------------------------------------------------------------------------:|
  |                           parquet 파일 아키텍쳐[^1]                            |

 - Row Group 0 은 하나의 로우 집합이며 각 컬럼에 대응되는 행들의 값이 모여 있는 집합으로 구성되며 이는 다시 페이지라는 단위로 분할 된다. 이렇게 나뉜 각 계층은 엔진이나 툴이 독립적으로 읽어올 수 있다
 - 각 row group 에 대한 통계 정보(e.g., 어느 컬럼의 최소값, 최대값 등)을 가지고 있다. 이 통계 정보를 기반으로 쿼리 실행 시 해당 row group을 읽을지 말지 결정할 수 있다.

### 삭제 파일(Delete Files)
- 삭제 파일은 데이터셋에서 어느 레코드가 삭제되었는지를 추적한다.
- 레코드가 삭제되면 변경분이 반영된 새 파일이 작성되거나 (copy-on-write [COW])
- 변경 분만을 기록한 새 파일이 작성되고 데이터를 읽을 때 이를 병합해서 보여줄 수 있다(merge-on-read [MOR])
- 수정/삭제 성능을 위해 MOR 방식을 취한다.
- 위치 삭제 파일(Positional delete files): 삭제된 행의 위치를 식별 하여 어떤 행이 논리적으로 삭제되었는지를 나타냄
- 균등 삭제 파일(Equality delete files): 컬럼 값 기반 삭제, 특정 조건 (특히 pk)에 해당하는 행을 논리적으로 삭제 처리하여 나타냄
  - 그렇다면.. 어떤 조건에 해당하는 행을 삭제 한 후 새롭게 추가된 행이 그 조건에 해당한다면 어떻게 될까? 이 새로운 레코드 역시 삭제 처리되는 건 아닐까?
  - 이를 해결 하기 위해 시퀀스 넘버를 활용한다. 모든 파일(data file, delete file)에는 고유한 시퀀스 번호가 할당되고 균등 삭제 파일은 자신보다 같거나 작은 수의 data file에만 적용함
  
## 메타데이터 레이어(The Metadata Layer)
### 매니페스트 파일(Manifest Files)
- 매니페스트 파일은 데이터 레이어의 파일들(datafiles/delete files)과 각 파일의 추가적인 세부사항과 통계 정보들을 추적한다.
- Hive와 구별되는 Iceberg의 특징이 바로 파일 레벨에서 어떤 데이터가 속해있는지를 추적한다는 것이다. (디렉터리 레벨이 아니라!)
- 매니페스트 파일은 메타데이터 트리의 말단 노드 레벨에서 이를 수행하는 파일이다.
- 매니페스트 파일의 내용은 해당 데이터 파일의 경로, 포맷, 어느 파티션에 속해 있는지, 레코드 개수, 컬럼의 최솟값 및 최댓값등을 포함
- 즉, 통계 데이터를 위해 데이터 파일을 열 필요가 줄어듦. -> 성능 향상
- 실제 매니페스트 파일의 실제 내용을 보면 이해가 더 쉬웠음!
- [메니페스트 파일 예시 (실제로는 avro 포맷이지만 편의상 json으로 변환한 것)](https://github.com/developer-advocacy-dremio/definitive-guide-to-apache-iceberg/blob/main/Resources/Chapter_2/manifest-file.json)

### 메니페스트 리스트(Manifest Lists)
- 매니페스트 리스트는 어떤 주어진 시점의 Iceberg 테이블의 스냅샷을 의미
- 해당 시점의 매니페스트 파일들과 해당 매니페스트 파일이 참조하는 데이터 파일의 위치, 속한 파티션, 파티션 컬럼의 최댓값, 최솟값을 포함
- 매니페스트 리스트는 어레이로 감싼 스트럭트 타입을 포함하며 각 스트럭트는 단일 매니페스트 파일을 추적한다.
- [매니페스트 리스트 예시 (실제로는 avro 포맷이지만 편의상 json으로 변환한 것)](https://github.com/developer-advocacy-dremio/definitive-guide-to-apache-iceberg/blob/main/Resources/Chapter_2/manifest-list.json)

### 메타데이터 파일(Metadata Files)
- 메타데이터 파일은 메니페스트 리스트를 추적한다.
- 메타데이터 파일은 특정 시점의 Iceberg 테이블에 관한 메타데이터를 저장한다.
- 각 시점 마다 변경이 이루어지면 메타데이터 파일이 생성되고 카탈로그에 의해 원자적으로 최신 메타데이터 파일로 등록된다.
- 테이블 커밋 히스토리는 선형적이며 다중 쓰기에 도움을 준다.
- [메타데이터 파일 예시]()https://github.com/developer-advocacy-dremio/definitive-guide-to-apache-iceberg/blob/main/Resources/Chapter_2/metadata-file.json

### 퍼핀 파일(Puffin Files)
- 퍼핀 파일은 좀 더 넓은 범위의 쿼리의 성능을 향상시키기 위해 데이터에 관련된 통계정보와 인덱스들을 저장한다.
- 퍼핀 파일은 블롭(blob)이라는 임의의 시퀀스 셋과 블롭을 분석하는데 필요한 메타데이터가 포함되어 있다.
- 현재는 Apache DataSketches 라이브러리의 Theta sketch(bloom filter와 같은 확률적 알고리즘-근사 알고리즘의 일종) 타입만을 지원
- Theta sketch는 주어진 행 집합에서 특정 컬럼의 고유 값 개수를 근사 계산할 수 있는 알고리즘이다. 연산 속도가 빠르고 리소스를 적게 쓸 수 있다.
- 정확한 값을 구하는데 비용이나 시간이 너무 많이 드는 경우, 동일한 연산을 반복해서 실행하는 경우 (대시보드)에 유용

## 카탈로그(Catalog)
- Iceberg 테이블의 현재 메타데이터 파일 위치를 추적하고 읽기/쓰기 엔진이 테이블의 최신 상태를 알게 해준다.
- 메타데이터 파일 경로를 찾으면 테이블 상태 (스키마, 스냅샷 등)을 확인 가능
- SQL쿼리로 최신 메타데이터 경로 조회 가능
- ```sql
  SELECT *
  FROM my_catalog.iceberg_book.orders.metadata_log_entries
  ORDER BY timestamp DESC
  LIMIT 1
  ```

[^1] https://parquet.apache.org/docs/file-format/