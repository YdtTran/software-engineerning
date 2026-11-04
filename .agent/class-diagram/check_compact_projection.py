"""Targeted corruption fixtures for the compact presentation boundary."""
import copy
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
import build_class_diagram as builder


def rejected(label, fn):
    try:
        fn()
    except AssertionError:
        print('PASS: rejected', label)
    else:
        raise AssertionError('Accepted corrupted fixture: ' + label)


def main():
    model = builder.read_model()
    builder.self_check(*model)
    bad_associations=copy.deepcopy(model[2]);bad_associations[10][1]='0..1'
    rejected('optional Trip booking',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_associations=copy.deepcopy(model[2]);bad_associations[26][2]='unrelatedVehicle'
    rejected('missing booked parking vehicle',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_associations=copy.deepcopy(model[2]);bad_associations[27][2]='unrelatedSlots'
    rejected('missing order-owned destination holds',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_classes=copy.deepcopy(model[0])
    bad_classes['ChargingRequest'][0].remove('-targetBatteryPercent : Integer')
    rejected('missing charging target',lambda:builder.self_check(bad_classes,model[1],model[2]))
    bad_associations=copy.deepcopy(model[2]);bad_associations[28][2]='unownedAllocation'
    rejected('ownerless pre-start allocation',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_associations=copy.deepcopy(model[2]);bad_associations[29][1]='1'
    rejected('mandatory Trip for automatic alerts',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_associations=copy.deepcopy(model[2]);bad_associations[30][2]='assignedOperator'
    rejected('reporter confused with assigned Operator',lambda:builder.self_check(model[0],model[1],bad_associations))
    bad_classes=copy.deepcopy(model[0])
    bad_classes['OperationalIncident'][0].remove('-reportedLocation : OptionalGeoLocation')
    rejected('lost incident location snapshot',lambda:builder.self_check(bad_classes,model[1],model[2]))
    bad_classes=copy.deepcopy(model[0])
    bad_classes['OperationalIncident'][0].remove('-description : String')
    rejected('lost incident description',lambda:builder.self_check(bad_classes,model[1],model[2]))
    selection = builder.display_selection()
    compact = builder.compact_projection(model[0], selection)
    bad = copy.deepcopy(selection)
    bad['UserAccount'][0].append('unknownMember')
    rejected('unknown member', lambda: builder.compact_projection(model[0], bad))
    bad = copy.deepcopy(selection)
    bad['ElectricVehicle'] = ([m[1:].split(' : ')[0] for m in model[0]['ElectricVehicle'][0]][:4], [])
    rejected('over budget', lambda: builder.compact_projection(model[0], bad))
    rejected('unmapped lifeline', lambda: builder.check_lifelines(sequence='participant ":Unmapped" as P0'))
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args()
    if args.output_dir:
        native = ET.parse(args.output_dir / 'drawio/smart_emobility_class_diagram.drawio').getroot()
        builder.check_native(native, compact, *model[1:])
        bad_graph = copy.deepcopy(native)
        occurrence = bad_graph.findall('diagram')[2].find(".//mxCell[@data-class='UserAccount']")
        cells = {c.get('id'):c for c in bad_graph.findall('diagram')[2].iter('mxCell')}
        cells[occurrence.get('id')+'_attrs'].set('value','-invented : String')
        rejected('inconsistent repeated members', lambda: builder.check_native(bad_graph, compact, *model[1:]))
        bad_graph = copy.deepcopy(native)
        bad_graph.find(".//mxCell[@id='r0_tail']").set('value','')
        rejected('lost multiplicity', lambda: builder.check_native(bad_graph, compact, *model[1:]))
    print('PASS: compact selection preserves unchanged canonical signatures')


if __name__ == '__main__':
    main()
