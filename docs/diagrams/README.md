# Editable UML diagrams

- [Use cases](01_Usecase_Diagram/README.md)
- [Sequence](02_Sequence_Diagram/README.md)
- [Activity](03_Activity_Diagram/README.md)
- [Statechart](04_Statechart_Diagram/README.md)
- [Class](05_Class_Diagram/README.md)
- [Component](06_Component_Diagram/README.md)
- [Package](07_Package_Diagram/README.md)
- [Deployment](deployment/README-deployment.md)

Open the `.drawio` source in Draw.io or VS Code with Draw.io Integration. Export a selected page from Draw.io into the ignored `.diagram-exports/` directory. With the Draw.io CLI installed, for example:

```sh
mkdir -p .diagram-exports
drawio -x -f png -o .diagram-exports/deployment.png docs/diagrams/deployment/DP01-deployment.drawio
```

Run `python3 .agent/scripts/check_diagram_sources.py` from the repository root to check the retained sources.
