"""Check the retained activity/statechart sources and their coverage."""
from check_diagram_sources import check
from generate_process_diagrams import ACTIVITIES, STATES, ACT, STA
import xml.etree.ElementTree as ET


if __name__ == '__main__':
    files = []
    for folder, diagrams in ((ACT, ACTIVITIES), (STA, STATES)):
        expected = {diagram[0] for diagram in diagrams}
        native = sorted((folder / 'drawio').glob('*.drawio'))
        assert {file.stem for file in native} == expected
        files.extend(native)
    check(files)
    vehicle = ET.parse(STA / 'drawio/SC01-Vehicle_State_Machine.drawio')
    uncertain = vehicle.find(".//mxCell[@id='e5']")
    assert (uncertain.get('source'), uncertain.get('target')) == ('Reserved', 'Reserved')
    assert 'retainClaim' in uncertain.get('data-contract')
    for edge in ('e7', 'e17', 'e21'):
        assert 'Queue' not in vehicle.find(f".//mxCell[@id='{edge}']").get('data-contract')
    trip = ET.parse(STA / 'drawio/SC03-Reservation_and_Trip_State_Machine.drawio')
    assert 'retainClaim' in trip.find(".//mxCell[@id='e5']").get('data-contract')
    assert 'notify' not in trip.find(".//mxCell[@id='body_Reported']").get('value').lower()
    charging = ET.parse(ACT / 'drawio/AD04-Reserve_Parking_and_Charging.drawio')
    assert 'service-level' in charging.find(".//mxCell[@id='n16']").get('value')
    assert 'service-level' in charging.find(".//mxCell[@id='n33']").get('value')
    assert charging.find(".//mxCell[@id='label_e12']") is None
    pickup = ET.parse(ACT / 'drawio/AD02-Pick_Up_Vehicle.drawio')
    assert 'vehicle code' in pickup.find(".//mxCell[@id='n1']").get('value')
    assert 'Keep claim' in pickup.find(".//mxCell[@id='n17']").get('value')
    ret = ET.parse(ACT / 'drawio/AD03-Return_Vehicle.drawio')
    assert 'confirm vehicle parked' in ret.find(".//mxCell[@id='n1']").get('value')
    transfer = ET.parse(ACT / 'drawio/AD05-Redistribute_Vehicles.drawio')
    assert 'destination slots' in transfer.find(".//mxCell[@id='n1']").get('value')
    incident = ET.parse(ACT / 'drawio/AD06-Handle_Operational_Incident.drawio')
    assert 'target safety flow' in incident.find(".//mxCell[@id='title']").get('value')
    assert incident.find(".//mxCell[@id='lane_1']").get('value') == 'Incident Service'
    assert 'notify' not in incident.find(".//mxCell[@id='n14']").get('value').lower()
