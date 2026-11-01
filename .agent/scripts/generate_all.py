import os
import sys
import subprocess

from diagram_builder import build_drawio_svg, write_catalog

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "01_Diagram", "01_Usecase_Diagram"))

print(f"Target base directory: {base_dir}")

# 1. GENERAL
build_drawio_svg(
    filepath=os.path.join(base_dir, "GENERAL", "general_usecase_diagram.drawio.svg"),
    width=960, height=700,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student",
    actor_right="Operator",
    usecases=[
        {"id": "uc_s1", "text": "Search Mobility Hub", "x": 260, "y": 80, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s2", "text": "View Available Vehicles", "x": 260, "y": 158, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s3", "text": "Reserve Vehicle", "x": 260, "y": 236, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s4", "text": "Pick Up Vehicle", "x": 260, "y": 314, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s5", "text": "Return Vehicle", "x": 260, "y": 392, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s6", "text": "Reserve Parking Space", "x": 260, "y": 470, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_s7", "text": "Request Charging", "x": 260, "y": 548, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},

        {"id": "uc_o1", "text": "Monitor Mobility Hub\nNetwork", "x": 540, "y": 80, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o2", "text": "Manage Mobility\nResources", "x": 540, "y": 158, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o3", "text": "Redistribute Vehicles", "x": 540, "y": 236, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o4", "text": "Handle Operational\nIncident", "x": 540, "y": 314, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o5", "text": "Manage Charging\nSchedule", "x": 540, "y": 392, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o6", "text": "Run What-if\nSimulation", "x": 540, "y": 470, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_o7", "text": "View Simulation\nResults", "x": 540, "y": 548, "w": 180, "h": 50, "fill": "#bae6fd", "is_bold": True},
    ],
    edges=[
        {"id": f"e_s{i}", "source": "actor_left", "target": f"uc_s{i}", "type": "assoc"} for i in range(1, 8)
    ] + [
        {"id": f"e_o{i}", "source": f"uc_o{i}", "target": "actor_right", "type": "assoc"} for i in range(1, 8)
    ]
)

# 2. STUDENTS / UC01-Search_Mobility_Hub
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC01-Search_Mobility_Hub.drawio.svg"),
    width=840, height=440,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "Search Mobility Hub", "x": 260, "y": 180, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_ext1", "text": "Filter by Vehicle Type", "x": 550, "y": 90, "w": 180, "h": 60},
        {"id": "uc_ext2", "text": "Filter by Distance", "x": 550, "y": 270, "w": 180, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext1", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_ext2", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
    ]
)

# 3. STUDENTS / UC02-View_Available_Vehicles
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC02-View_Available_Vehicles.drawio.svg"),
    width=820, height=360,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "View Available\nVehicles", "x": 250, "y": 140, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_ext", "text": "View Vehicle Details", "x": 540, "y": 140, "w": 180, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
    ]
)

# 4. STUDENTS / UC03-Reserve_Vehicle
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC03-Reserve_Vehicle.drawio.svg"),
    width=820, height=360,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "Reserve Vehicle", "x": 250, "y": 140, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc", "text": "Verify Vehicle\nAvailability", "x": 540, "y": 140, "w": 180, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_base", "target": "uc_inc", "type": "include", "label": "<<include>>"},
    ]
)

# 5. STUDENTS / UC04-Pick_Up_Vehicle
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC04-Pick_Up_Vehicle.drawio.svg"),
    width=860, height=500,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "Pick Up Vehicle", "x": 260, "y": 200, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_ext", "text": "Report Vehicle Damage", "x": 260, "y": 360, "w": 170, "h": 60},
        {"id": "uc_inc1", "text": "Validate Reservation\nStatus", "x": 560, "y": 100, "w": 180, "h": 60},
        {"id": "uc_inc2", "text": "Unlock Vehicle", "x": 560, "y": 280, "w": 180, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
    ]
)

# 6. STUDENTS / UC05-Return_Vehicle
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC05-Return_Vehicle.drawio.svg"),
    width=860, height=480,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "Return Vehicle", "x": 250, "y": 200, "w": 160, "h": 70, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Check Hub Space\nAvailability", "x": 560, "y": 80, "w": 180, "h": 70},
        {"id": "uc_inc2", "text": "Verify Vehicle &\nBattery Status", "x": 560, "y": 200, "w": 180, "h": 70},
        {"id": "uc_inc3", "text": "Confirm Vehicle\nReturn", "x": 560, "y": 320, "w": 180, "h": 70},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 7. STUDENTS / UC06-Reserve_Parking_Space
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC06-Reserve_Parking_Space.drawio.svg"),
    width=860, height=480,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_cancel", "text": "Cancel Parking\nReservation", "x": 260, "y": 90, "w": 160, "h": 60},
        {"id": "uc_base", "text": "Reserve Parking\nSpace", "x": 260, "y": 250, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Confirm Parking\nReservation", "x": 570, "y": 100, "w": 170, "h": 60},
        {"id": "uc_inc2", "text": "Validate Vehicle\nInformation", "x": 570, "y": 220, "w": 170, "h": 60},
        {"id": "uc_inc3", "text": "Check Parking\nAvailability", "x": 570, "y": 340, "w": 170, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_cancel", "type": "assoc"},
        {"id": "e2", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 8. STUDENTS / UC07-Request_Charging
build_drawio_svg(
    filepath=os.path.join(base_dir, "STUDENTS", "UC07-Request_Charging.drawio.svg"),
    width=860, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Student", actor_right=None,
    usecases=[
        {"id": "uc_base", "text": "Request Charging", "x": 260, "y": 180, "w": 160, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Check Charging\nAvailability", "x": 570, "y": 70, "w": 170, "h": 60},
        {"id": "uc_inc2", "text": "Confirm Charging\nRequest", "x": 570, "y": 180, "w": 170, "h": 60},
        {"id": "uc_inc3", "text": "Validate Charging\nRequest", "x": 570, "y": 290, "w": 170, "h": 60},
        {"id": "uc_cancel", "text": "Cancel Charging\nRequest", "x": 460, "y": 410, "w": 170, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "actor_left", "target": "uc_cancel", "type": "assoc"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 9. OPERATOR / UC8-Monitor_Mobility_Hub_Network
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC8-Monitor_Mobility_Hub_Network.drawio.svg"),
    width=900, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext", "text": "Inspect Selected Hub", "x": 370, "y": 80, "w": 180, "h": 55},
        {"id": "uc_base", "text": "Monitor Mobility Hub\nNetwork", "x": 360, "y": 210, "w": 200, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "View Vehicle Availability\nand Battery Levels", "x": 200, "y": 380, "w": 190, "h": 60},
        {"id": "uc_inc2", "text": "View Parking\nOccupancy", "x": 430, "y": 380, "w": 170, "h": 60},
        {"id": "uc_inc3", "text": "View Charger Status", "x": 640, "y": 380, "w": 170, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 10. OPERATOR / UC9-Manage_Mobility_Resources
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC9-Manage_Mobility_Resources.drawio.svg"),
    width=940, height=480,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_child1", "text": "Suspend Resource", "x": 200, "y": 90, "w": 150, "h": 55},
        {"id": "uc_child2", "text": "Reactivate Resource", "x": 370, "y": 90, "w": 150, "h": 55},
        {"id": "uc_child3", "text": "Register Resource", "x": 540, "y": 90, "w": 150, "h": 55},
        {"id": "uc_child4", "text": "Update Resource\nInformation", "x": 710, "y": 90, "w": 160, "h": 55},
        {"id": "uc_base", "text": "Manage Mobility\nResources", "x": 320, "y": 320, "w": 190, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_validate", "text": "Validate Resource Data", "x": 620, "y": 320, "w": 170, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_child1", "target": "uc_base", "type": "generalization"},
        {"id": "e3", "source": "uc_child2", "target": "uc_base", "type": "generalization"},
        {"id": "e4", "source": "uc_child3", "target": "uc_base", "type": "generalization"},
        {"id": "e5", "source": "uc_child4", "target": "uc_base", "type": "generalization"},
        {"id": "e6", "source": "uc_child3", "target": "uc_validate", "type": "include", "label": "<<include>>"},
        {"id": "e7", "source": "uc_child4", "target": "uc_validate", "type": "include", "label": "<<include>>"},
    ]
)

# 11. OPERATOR / UC10-Redistribute_Vehicles
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC10-Redistribute_Vehicles.drawio.svg"),
    width=900, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext", "text": "Find Alternative\nDestination Hub", "x": 360, "y": 80, "w": 180, "h": 55},
        {"id": "uc_base", "text": "Redistribute Vehicles", "x": 360, "y": 210, "w": 180, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Check Transferable\nVehicles", "x": 200, "y": 380, "w": 180, "h": 60},
        {"id": "uc_inc2", "text": "Check Destination\nParking Capacity", "x": 420, "y": 380, "w": 170, "h": 60},
        {"id": "uc_inc3", "text": "Create Transfer Order", "x": 630, "y": 380, "w": 160, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 12. OPERATOR / UC11-Handle_Operational_Incident
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC11-Handle_Operational_Incident.drawio.svg"),
    width=920, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext1", "text": "Isolate Faulty Resource", "x": 240, "y": 80, "w": 170, "h": 55},
        {"id": "uc_ext2", "text": "Schedule Maintenance", "x": 470, "y": 80, "w": 170, "h": 55},
        {"id": "uc_base", "text": "Handle Operational\nIncident", "x": 340, "y": 210, "w": 190, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Review Incident Details", "x": 200, "y": 380, "w": 170, "h": 60},
        {"id": "uc_inc2", "text": "Assess Incident Impact", "x": 420, "y": 380, "w": 160, "h": 60},
        {"id": "uc_inc3", "text": "Update Incident Status", "x": 630, "y": 380, "w": 160, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_base", "target": "uc_ext1", "type": "include", "label": "<<include>>"},
        {"id": "e3", "source": "uc_base", "target": "uc_ext2", "type": "include", "label": "<<include>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e6", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 13. OPERATOR / UC12-Manage_Charging_Schedule
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC12-Manage_Charging_Schedule.drawio.svg"),
    width=900, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext1", "text": "Reassign on Port\nMalfunction", "x": 270, "y": 70, "w": 180, "h": 55},
        {"id": "uc_base", "text": "Manage Charging\nSchedule", "x": 280, "y": 210, "w": 180, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_ext2", "text": "Override Charging\nSchedule", "x": 270, "y": 370, "w": 180, "h": 55},
        {"id": "uc_inc1", "text": "Monitor Charging\nQueue", "x": 610, "y": 90, "w": 170, "h": 60},
        {"id": "uc_inc2", "text": "Prioritize Charging\nOrder", "x": 610, "y": 210, "w": 170, "h": 60},
        {"id": "uc_inc3", "text": "Allocate Charging\nPoints", "x": 610, "y": 330, "w": 170, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext1", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_ext2", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e6", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

# 14. OPERATOR / UC13-Run_What-if_Simulation
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC13-Run_What-if_Simulation.drawio.svg"),
    width=960, height=520,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext1", "text": "Export Simulation\nReport", "x": 300, "y": 70, "w": 170, "h": 55},
        {"id": "uc_ext2", "text": "Apply Coordination\nRecommendations", "x": 560, "y": 70, "w": 180, "h": 55},
        {"id": "uc_base", "text": "Run What-if\nSimulation", "x": 410, "y": 200, "w": 180, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Select Simulation\nScenario", "x": 190, "y": 370, "w": 150, "h": 60},
        {"id": "uc_inc2", "text": "Configure Scenario\nParameters", "x": 360, "y": 370, "w": 155, "h": 60},
        {"id": "uc_inc3", "text": "Execute Network\nSimulation", "x": 535, "y": 370, "w": 150, "h": 60},
        {"id": "uc_inc4", "text": "View Simulation\nResults (UC-14)", "x": 705, "y": 370, "w": 160, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext1", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_ext2", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e4", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e6", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
        {"id": "e7", "source": "uc_base", "target": "uc_inc4", "type": "include", "label": "<<include>>"},
    ]
)

# 15. OPERATOR / UC14-View_Simulation_Results
build_drawio_svg(
    filepath=os.path.join(base_dir, "OPERATOR", "UC14-View_Simulation_Results.drawio.svg"),
    width=960, height=540,
    system_title="Smart E-Mobility Hub System",
    actor_left="Operator", actor_right=None,
    usecases=[
        {"id": "uc_ext1", "text": "Export Simulation\nResults", "x": 230, "y": 100, "w": 160, "h": 55},
        {"id": "uc_ext2", "text": "Filter Simulation\nResults", "x": 410, "y": 70, "w": 160, "h": 55},
        {"id": "uc_ext3", "text": "Compare Simulation\nResults", "x": 230, "y": 370, "w": 170, "h": 55},
        {"id": "uc_base", "text": "View Simulation\nResults", "x": 400, "y": 220, "w": 180, "h": 65, "fill": "#bae6fd", "is_bold": True},
        {"id": "uc_inc1", "text": "Display\nRecommendations", "x": 640, "y": 100, "w": 160, "h": 60},
        {"id": "uc_inc2", "text": "Retrieve Simulation\nResults", "x": 690, "y": 220, "w": 160, "h": 60},
        {"id": "uc_inc3", "text": "Display Simulation\nMetrics", "x": 640, "y": 350, "w": 160, "h": 60},
    ],
    edges=[
        {"id": "e1", "source": "actor_left", "target": "uc_base", "type": "assoc"},
        {"id": "e2", "source": "uc_ext1", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e3", "source": "uc_ext2", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e4", "source": "uc_ext3", "target": "uc_base", "type": "extend", "label": "<<extend>>"},
        {"id": "e5", "source": "uc_base", "target": "uc_inc1", "type": "include", "label": "<<include>>"},
        {"id": "e6", "source": "uc_base", "target": "uc_inc2", "type": "include", "label": "<<include>>"},
        {"id": "e7", "source": "uc_base", "target": "uc_inc3", "type": "include", "label": "<<include>>"},
    ]
)

write_catalog(base_dir)
subprocess.run(["node", os.path.join(os.path.dirname(__file__), "render_usecases.cjs")], check=True)
print("Regeneration completed: native Draw.io, verified editable SVG/PNG exports, and code catalog.")
