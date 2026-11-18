# DV01 — Component Diagram

[**Bản tổng quan 16:9**](DV01-Component_Overview_16x9.drawio) mô tả bản demo hiện tại. Android native, Flutter và Operator Console dùng HTTP `/api/v1`. Một ứng dụng Node.js / Express lắp ghép ba module và dùng chung adapter SQLite. Hình trụ SQLite biểu thị tệp dữ liệu cục bộ. Các phụ thuộc giữa module và adapter thiết bị được trình bày trong [bản chi tiết](component-diagram.drawio) và [PlantUML chi tiết](component-diagram.puml).

Nguồn đối chiếu: [Express composition root](../../../app/src/app.js), [hướng dẫn demo](../../../app/README.md) và [client Flutter](../../../app/flutter_mobile/README.md). Bản tổng quan dùng hình chữ nhật có stereotype và mũi tên dependency theo [ký pháp Component UML](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-component-diagram/).

Mở tệp bằng Draw.io Integration trong VS Code. Xuất slide qua **File → Export as → PNG/SVG → Size: Page**. Nhập PlantUML qua **Advanced → PlantUML** trong Draw.io hoặc **File → Import → PlantUML** trong Visual Paradigm Online.

<details>
<summary>PlantUML và Mermaid cho bản tổng quan</summary>

```plantuml
@startuml
left to right direction
skinparam componentStyle uml2
component "Android native" as Android
component "Flutter Mobile" as Flutter
component "Operator Console" as Operator
rectangle "Backend · Node.js / Express modular monolith" {
  component "Express API" as API
  component "Mobility / Simulation" as Mobility
  component "Operations" as Operations
  component "Parking / Charging" as Parking
  component "SQLiteClient" as Adapter
}
database "SQLite" as DB
Android ..> API : HTTP /api/v1
Flutter ..> API : HTTP /api/v1
Operator ..> API : HTTP /api/v1
API ..> Mobility
API ..> Operations
API ..> Parking
Mobility ..> Adapter
Operations ..> Adapter
Parking ..> Adapter
Adapter ..> DB
@enduml
```

```mermaid
flowchart LR
  Android["Android native"] -. "HTTP /api/v1" .-> API
  Flutter["Flutter Mobile"] -. "HTTP /api/v1" .-> API
  Operator["Operator Console"] -. "HTTP /api/v1" .-> API
  subgraph Backend["Backend · Node.js / Express modular monolith"]
    API["Express API"] -.-> Mobility["Mobility / Simulation"]
    API -.-> Operations["Operations"]
    API -.-> Parking["Parking / Charging"]
    Mobility -.-> Adapter["SQLiteClient"]
    Operations -.-> Adapter
    Parking -.-> Adapter
  end
  Adapter -.-> DB[(SQLite)]
```

</details>
