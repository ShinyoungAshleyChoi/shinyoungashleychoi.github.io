---
layout: post
title: Kubernetes에서 논리적/물리적 격리 이해하기
tags: ["kubernetes",]
---

# 1. Kubernetes는 왜 공간을 나누려고 할까?

쿠버네티스 클러스터는 기본적으로 여러 워크로드가 하나의 자원을 공유하는 구조다.

예를 들어 하나의 클러스터 안에는:
- 운영(prod) 환경
- 개발(dev) 환경
- 배치 작업
- 모니터링 시스템
- GPU 워크로드
-여러 팀의 서비스

같은 것들이 동시에 존재할 수 있다.
이때 필요한 것은 단순한 “분리”가 아니라:

- 누가 무엇을 볼 수 있는가
- 누가 어떤 자원을 사용할 수 있는가
- 어떤 워크로드가 어디에서 실행되는가
- 어떤 트래픽이 서로 통신 가능한가

같은 다양한 관점의 격리다.

그리고 Kubernetes는 이를 하나의 기능으로 해결하지 않는다. 대신 여러 레이어의 기능을 조합해서 격리를 구성한다.

# 2. 논리적 격리: Namespace

가장 먼저 접하게 되는 격리 개념은 Namespace다.
Namespace는 하나의 클러스터 안에서 리소스를 논리적으로 구분하기 위한 단위다.

예를 들어
- prod namespace
- dev namespace
- monitoring namespace
- ml-platform namespace

처럼 팀이나 환경 기준으로 나누는 경우가 많다.

Namespace를 사용하면, 리소스 이름 충돌을 방지할 수 있고 팀별 리소스를 구분할 수 있으며, RBAC이나 ResourceQuota 적용 범위를 제한할 수 있다.

예를 들어 아래 두 Pod는 이름이 같아도 공존 가능하다.
- dev/api-server
- prod/api-server

왜냐하면 Namespace가 서로 다르기 때문이다.
하지만 여기서 자주 생기는 오해가 있다.

### Namespace는 “논리적” 격리일 뿐, 물리적 격리가 아니다.

예를 들어, prod namespace의 Pod와 dev namespace의 Pod가 실제로는 같은 Node에서 실행될 수도 있다.
즉 Namespace는 리소스 관리 단위, 권한 관리 단위, 논리적 소유권 단위에 가깝지, 실행 위치 자체를 분리하지는 않는다.

# 3. 물리적 격리: Node와 NodeGroup

실제 워크로드가 실행되는 위치는 Node다.

Node는:

- VM
- Bare Metal
- Cloud Instance

같은 실제 컴퓨팅 자원을 의미한다. Pod는 결국 특정 Node 위에서 실행된다.
실무에서는 아래처럼 Node를 목적별로 묶어서 운영하는 경우가 많다.

- prod-nodegroup
- dev-nodegroup
- gpu-nodegroup
- spot-nodegroup 

이런 분리가 필요한 이유는 워크로드 특성이 서로 다르기 때문이다.
예를 들어 운영 서비스는 안정성이 중요하고 배치 작업은 비용 효율이 중요하며 GPU workload는 특정 하드웨어가 필요하다.

따라서 서로 다른 워크로드를 서로 다른 NodeGroup에 배치하게 된다.


# 4. “어디에 배치할 것인가”: Scheduling 제어

Namespace만으로는 Pod의 실행 위치를 제어할 수 없다.
Pod를 특정 Node에 배치하려면 Scheduling 관련 기능을 사용해야 한다.

대표적으로 nodeSelector, node affinity, taint/toleration 같은 기능들이 있다.


## nodeSelector

가장 단순한 방식이다. Node에 label을 붙이고
```yaml
node-role=gpu
```
Pod에서 해당 label을 지정한다.
```yaml
nodeSelector:
node-role: gpu
```
그러면 해당 label이 붙은 Node에만 스케줄링된다.


## NodeAffinity
Affinity는 조금 더 유연한 조건 기반 스케줄링이다.

예를 들어 특정 zone 선호, 특정 instance type 선호, 특정 label 필수같은 정책을 표현할 수 있다.

여기서 중요한 건

- required: 반드시 만족
- preferred: 가능하면 선호

라는 차이가 있다는 점이다. 즉 스케줄링에도 “강제”와 “선호” 개념이 존재한다.

## Taint / Toleration

Affinity가 Pod를 특정 Node 쪽으로 “끌어당기는” 개념이라면,
Taint는 특정 Pod를 Node에서 “밀어내는” 개념에 가깝다.

예를 들어 GPU Node에 이런 taint를 설정할 수 있다.
```yaml
gpu=true:NoSchedule
```
그러면 toleration이 없는 Pod는 해당 Node에 올라갈 수 없다. 즉, Taint = 출입 제한, Toleration = 출입 허가증 같은 느낌이다.

다만 여기서도 중요한 포인트가 있다. toleration이 있다고 해서 반드시 그 Node에 배치되는 것은 아니다. 단지 “배치될 수 있는 자격”이 생기는 것뿐이다.
실제 배치는 affinity, resource availability, scheduler 상태등을 종합해서 결정된다.




### Kubernetes의 격리는 하나의 기능이 아니라, 여러 레이어를 조합해서 만드는 구조다.

많은 사람들이 처음엔 Namespace를 만들면 환경이 완전히 분리된다고 생각하거나 NodeGroup만 나누면 멀티테넌시가 해결된다고 생각한다.
하지만 실제 운영 환경에서는 Namespace로 논리적 경계를 만들고 RBAC으로 권한을 제한하고 ResourceQuota로 자원 사용량을 통제하고 NetworkPolicy로 통신 범위를 제한하고 Affinity/Taint로 실행 위치를 제어하면서

여러 기능이 함께 동작해야 원하는 수준의 격리가 만들어진다.

즉 Kubernetes에서 “분리”란 단일 기능이 아니라, 리소스 관점, 권한 관점, 네트워크 관점, 인프라 관점, 스케줄링 관점이 서로 겹쳐지는 결과에 가깝다.