"""Activity/state models, native draw.io, and matching textual catalogs.

Run this instead of the historical generate_all_phase2_v2.py for AD/SC.
"""
from pathlib import Path
import sys
import textwrap
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[2]
ACT = BASE / '01_Diagram/03_Activity_Diagram'
STA = BASE / '01_Diagram/04_Statechart_Diagram'


def a(lane, text): return ('action', lane, text)
def o(text): return ('object', 1, text)
def end(): return ('end', 0, '')
def branch(lane, question, guard, yes, no): return ('decision', lane, question, guard, yes, no)
def fail(text): return [a(1, text), end()]
def confirm(lane=0):
    return branch(lane, 'Confirm operation?', '[confirm]', [], [a(lane, 'Close screen / Back\nKeep current state'), end()])


ACTIVITIES = [
 ('AD01-Reserve_Vehicle', 'Reserve Vehicle', 'UC03', ['Student / App', 'Backend', 'Notification Service'], [
    a(0, 'Select Hub and vehicle'), confirm(),
    a(1, 'Validate identity and request ID\nRead current vehicle state'),
    branch(1, 'Eligible and available?', '[Available, battery >=20%, no hold]', [
        a(1, 'Atomically hold vehicle and save\nreservation; expiresAt = now + 15 min'),
        o(':Reservation [Reserved]'),
        ('fork', 1, '', [a(0, 'Display ticket and expiry time')], [a(2, 'Queue confirmation after commit\nRetry delivery without rollback')]),
    ], fail('Show availability conflict\nReturn to vehicle list')),
 ]),
 ('AD02-Pick_Up_Vehicle', 'Pick Up Vehicle', 'UC04', ['Student / App', 'Backend', 'IoT / Simulated Station'], [
    a(0, 'Select ticket and scan QR / PIN'), confirm(),
    a(1, 'Validate owner, Hub, reservation\nnow < expiresAt and request ID'),
    branch(1, 'Valid reservation?', '[valid]', [
        a(1, 'Claim pickup atomically\nSerialize with expiry / cancellation'),
        a(2, 'Unlock with the same command ID\nAwait acknowledgement; max 3 attempts'),
        branch(1, 'Unlock confirmed?', '[matching acknowledgement]', [
            a(1, 'Atomically consume reservation\nStart trip; free source slot; set InUse'),
            o(':Trip [Active]'), a(0, 'Display active trip'),
        ], fail('Keep vehicle unavailable\nReconcile uncertain unlock via UC11\nDo not start trip or charge time')),
    ], fail('Show invalid / expired ticket\nRelease only expired reservation hold\nReturn to ticket screen')),
 ]),
 ('AD03-Return_Vehicle', 'Return Vehicle', 'UC05, UC11A', ['Student / App', 'Backend', 'IoT / Simulated Station'], [
    a(0, 'Select destination Hub / slot'), confirm(),
    a(1, 'Validate active-trip owner\nClaim usable destination slot'),
    branch(1, 'Destination claim succeeded?', '[claimed]', [
        a(0, 'Dock vehicle safely'), a(2, 'Confirm vehicle identity, Hub and lock\nAwait telemetry; max 3 attempts'),
        branch(1, 'Safe return confirmed?', '[matching vehicle and locked]', [
            a(1, 'Close trip and occupy slot atomically\nRecord duration / distance; no payment'),
            o(':Trip [Completed]'),
            branch(1, 'Unresolved vehicle fault?', '[fault]', [a(1, 'Keep vehicle Faulty\nAssign recovery / maintenance')], [
                branch(1, 'Battery sufficient?', '[battery >=20%]', [a(1, 'Set vehicle Available')], [a(1, 'Set vehicle NeedsCharging\nQueue charging request')]),
            ]), a(0, 'Display return confirmation'),
        ], fail('Keep trip Active; block uncertain slot\nShow return screen / alternate slot\nEscalate to Operator; do not free vehicle')),
    ], fail('Suggest another slot / Hub\nKeep trip Active; return to Hub selection')),
 ]),
 ('AD04-Reserve_Parking_and_Charging', 'Private Parking and Charging', 'UC06, UC06A/B, UC07, UC07A, UC12', ['Student / App', 'Backend / Scheduler', 'IoT / Simulated Station'], [
    a(0, 'Select Hub, private vehicle and arrival'), confirm(),
    a(1, 'Validate owner and arrival time\nAtomically claim a usable slot'),
    branch(1, 'Parking hold committed?', '[committed]', [
        o(':ParkingReservation [Reserved]'), a(0, 'Present ticket at scheduled arrival'),
        a(1, 'Validate owner, Hub and arrival window\nScheduledArrival <= now < arrival + 30 min'),
        branch(1, 'Check-in valid and vehicle present?', '[valid and arrival confirmed]', [
            a(1, 'Atomically mark Fulfilled\nChange Held slot to Occupied'),
            branch(0, 'Request charging?', '[yes]', [
                a(1, 'Validate ownership, battery and connector\nSave charging request Queued'),
                branch(1, 'Compatible port and power ready?', '[ready; allocated kW <= powerLimitKW]', [
                    a(2, 'Confirm plug and electrical safety\nStart supply; await acknowledgement'),
                    branch(1, 'Start acknowledged?', '[confirmed]', [
                        a(1, 'Mark session Active'), a(0, 'Request stop / reach target or\n80% with urgent queue'),
                        a(2, 'Cut power with same command ID\nAwait acknowledgement; max 3 attempts'),
                        branch(1, 'Power off confirmed?', '[confirmed]', [
                            a(1, 'Close session; release power allocation\nKeep parking Occupied until unplug'),
                        ], fail('Quarantine port; open incident\nDo not report stop / checkout success')),
                    ], fail('Block uncertain port; open incident\nKeep request pending reconciliation')),
                ], fail('Keep request Queued; show queue\nAllow cancel; retain occupied parking')),
            ], []),
            a(0, 'Request check-out and unplug'),
            a(1, 'Validate owner; cancel queued request\nConfirm no active supply or plug'),
            a(2, 'Confirm vehicle physically departed'),
            branch(1, 'Departure safe and confirmed?', '[confirmed]', [
                a(1, 'Atomically clear occupant\nRelease usable slot once; retain history'),
            ], fail('Keep slot Occupied / quarantined\nShow parking screen; request assistance')),
        ], fail('Reject check-in; allow Back / rebook\nCancel or expire only unfulfilled hold\nNever free an occupied slot')),
    ], fail('Show conflict and alternative Hub\nReturn to parking selection')),
 ]),
 ('AD05-Redistribute_Vehicles', 'Redistribute Vehicles', 'UC10, UC10A/B', ['Operator', 'Backend / Rebalance', 'Field / Simulated Telemetry'], [
    a(0, 'Choose source, destination and vehicles'), confirm(),
    a(1, 'Validate Operator; check battery >=80%\nAvailable vehicles and destination capacity'),
    branch(1, 'Atomic resource claim succeeded?', '[claimed]', [
        a(1, 'Create Planned order\nHold vehicles and destination slots'), o(':TransferOrder [Planned]'),
        branch(0, 'Confirm departure?', '[depart]', [
            a(1, 'Recheck battery >=80% and Planned\nCommit InTransit; release source slots'),
            a(2, 'Transport vehicles to destination\nReport arrival to Operator'),
            a(0, 'Reconcile all vehicle IDs and target slots'),
            branch(1, 'Entire order safely arrived?', '[all IDs and usable destination slots]', [
                a(1, 'Commit Completed and occupy targets\nClassify Available / NeedsCharging / Faulty'),
            ], fail('Keep InTransit and required holds\nOpen incident; reassign target atomically\nDo not complete a partial batch')),
        ], [branch(0, 'Cancel Planned order?', '[cancel confirmed]', [
            a(1, 'Cancel only if still Planned\nRelease only order-owned holds\nIf departure won race: keep InTransit'),
        ], [a(0, 'Close order / Back\nKeep Planned and its holds')])]),
    ], fail('Show conflict; suggest fewer vehicles\nReturn to source / target selection')),
 ]),
 ('AD06-Handle_Operational_Incident', 'Handle Operational Incident', 'UC11, UC11A, UC12', ['Operator / Student', 'Incident Service', 'Field / IoT / Simulated Telemetry'], [
    a(0, 'Submit trip report / inspect sensor alert'),
    a(1, 'Validate report ownership / Operator role\nDeduplicate request and save incident'),
    branch(1, 'Electrical hazard?', '[hazard]', [a(2, 'Cut supply; quarantine affected port')], [a(1, 'Block new allocations\nDo not lock a moving vehicle')]),
    a(1, 'Notify Operator after commit\nPreserve active trip until safe recovery'),
    a(0, 'Assign recovery / repair and inspect site'),
    a(2, 'Recover safely and repair resource\nRecord electrical / mechanical test result'),
    branch(1, 'Safety test passed?', '[passed and safe location confirmed]', [
        a(0, 'Confirm repair acceptance'),
        a(1, 'Reconcile trip, reservations and occupancy\nClose trip only via safe UC05 confirmation'),
        a(1, 'Restore eligible resource state\nRequeue interrupted charging; keep audit'),
    ], fail('Keep Faulty / Maintenance\nLeave incident open; assign next repair\nClose screen without restoring resource')),
 ]),
 ('AD07-Run_What_if_Simulation', 'Run What-if Simulation', 'UC13, UC14; handoff UC10 / UC12', ['Operator', 'Backend / Sandbox', 'Operational Services'], [
    a(0, 'Select scenario and enter parameters'), confirm(),
    a(1, 'Validate ranges; snapshot network\nRun simulation on isolated copy'),
    branch(1, 'Run completed within deadline?', '[completed]', [
        o(':SimulationResult [Completed]'), a(0, 'Review KPIs and recommendations'),
        branch(0, 'Apply recommendation?', '[apply]', [
            a(1, 'Revalidate role and current live resources'),
            branch(1, 'Recommendation still feasible?', '[valid]', [
                a(2, 'Submit explicit UC10 Planned order\nor UC12 schedule change\nDo not copy sandbox state to live'),
            ], fail('Show stale-result conflict\nReturn to scenario configuration')),
        ], [a(0, 'Export report / close results\nKeep live resources unchanged')]),
    ], fail('Show timeout / invalid-input error\nDiscard sandbox; return to configuration')),
 ]),
]


def state(id, name, *actions, group=''):
    return dict(id=id, name=name, actions=list(actions), group=group, type='state')


STATES = [
 ('SC01-Vehicle_State_Machine', 'Vehicle Lifecycle', 'UC03–05, UC10, UC11, UC12',
  {'Operational': 'Operational Service'}, [
    state('Available', 'Available', 'entry / enableBookingIfUnheld()', 'do: receiveTelemetry()', group='Operational'),
    state('Reserved', 'Reserved', 'entry / holdFor15Minutes()', 'exit / stopExpiryTimer()', group='Operational'),
    state('InUse', 'In-Use', 'do: streamTripTelemetry()', group='Operational'),
    state('NeedsCharging', 'Needs Charging', 'entry / disableBooking()', 'do: waitForScheduler()', group='Operational'),
    state('Charging', 'Charging', 'do: monitorSupplyAndBattery()', group='Operational'),
    state('TransferHeld', 'Held for Transfer', 'entry / excludeFromBooking()'),
    state('InTransit', 'In-Transit', 'do: trackTransferManifest()'),
    state('Faulty', 'Faulty', 'entry / blockNewAllocations()', 'do: preserveTripAndLocation()'),
    state('Maintenance', 'Under Maintenance', 'do: diagnoseAndRepair()'),
    state('Retired', 'Retired', 'entry / archiveVehicle()'),
  ], [
    ('initial','Available','', '', ''),
    ('Available','Reserved','reserveCommitted','battery >=20% and no other hold','linkReservation()'),
    ('Reserved','Available','cancelCommitted','pickupNotClaimed','releaseOwnHold()'),
    ('Reserved','Available','expiryReached','now >= expiresAt and pickupNotClaimed','releaseOwnHold()'),
    ('Reserved','InUse','unlockConfirmed','pickupClaimed and matchingAck','consumeReservationAndStartTrip()'),
    ('Reserved','Faulty','unlockUncertain','threeAttemptsExhausted','openIncidentAndReconcile()'),
    ('InUse','Available','safeReturnConfirmed','noFault and battery >=20%','closeTripAndOccupySlot()'),
    ('InUse','NeedsCharging','safeReturnConfirmed','noFault and battery <20%','closeTripAndQueueCharge()'),
    ('NeedsCharging','Charging','powerOnConfirmed','plugSafe and portAllocated','startSession()'),
    ('Charging','Available','powerOffConfirmed','noFault and battery >=20%','closeSession()'),
    ('Charging','NeedsCharging','powerOffConfirmed','noFault and battery <20%','closeSessionAndRequeue()'),
    ('Operational','Faulty','faultDetected','','blockAllocations; cutSupplyIfCharging; neverLockMovingVehicle'),
    ('Available','TransferHeld','planCommitted','battery >=80% and capacityHeld','linkPlannedOrder()'),
    ('TransferHeld','Available','cancelCommitted','orderStillPlanned and noFault','releaseOwnHolds()'),
    ('TransferHeld','InTransit','departureConfirmed','battery >=80% and orderStillPlanned','freeSourceSlot()'),
    ('TransferHeld','Faulty','faultDetected','','invalidateDeparture()'),
    ('InTransit','Available','arrivalCommitted','wholeOrderArrived and noFault and battery >=20%','occupyTarget()'),
    ('InTransit','NeedsCharging','arrivalCommitted','wholeOrderArrived and noFault and battery <20%','occupyTargetAndQueue()'),
    ('InTransit','Faulty','arrivalCommitted','wholeOrderArrived and fault','occupyTargetAndOpenIncident()'),
    ('Faulty','Maintenance','recoveryConfirmed','safeStationaryLocation','assignRepair()'),
    ('Maintenance','Available','repairAccepted','testPassed and noActiveTrip and battery >=20%','reconcileHolds()'),
    ('Maintenance','NeedsCharging','repairAccepted','testPassed and noActiveTrip and battery <20%','queueCharge()'),
    ('Maintenance','Retired','retireApproved','noTripOrTransferOrReservation and supplyOff','archiveHistory()'),
    ('Retired','final','','',''),
  ]),
 ('SC02-Charging_Point_State_Machine', 'Charging Point Lifecycle', 'UC07, UC07A, UC11, UC12',
  {'Service': 'Power Station Service'}, [
    state('Idle', 'Idle / Available', 'do: awaitAllocation()', group='Service'),
    state('Reserved', 'Reserved', 'entry / holdPortAndPower()', group='Service'),
    state('Starting', 'Starting', 'entry / sendPowerOn()', 'do: awaitMatchingAck()', group='Service'),
    state('Charging', 'Charging', 'do: monitorEnergyAndSafety()', group='Service'),
    state('Stopping', 'Stopping', 'entry / sendPowerOff()', 'do: retrySameIDUpTo3Times()', group='Service'),
    state('Complete', 'Stopped / Awaiting Unplug', 'entry / closeByReasonAndFreePower()', 'do: keepParkingOccupied()', group='Service'),
    state('Fault', 'Fault / Isolated', 'entry / emergencyCutAndQuarantine()', 'do: reconcileSessionAndAllocation()'),
    state('Repair', 'Under Repair', 'do: diagnoseAndRepair()'),
    state('Retired', 'Retired', 'entry / archivePort()'),
  ], [
    ('initial','Idle','','',''),
    ('Idle','Reserved','allocate','compatible and budgetAvailable','claimPortAndPower()'),
    ('Reserved','Idle','cancelOrExpire','notEnergized','releaseOwnAllocation()'),
    ('Reserved','Starting','plugConfirmed','ownerValid and electricalSafe','sendStartCommand()'),
    ('Starting','Charging','powerOnConfirmed','matchingAck','activateSession()'),
    ('Starting','Fault','startTimeout','','openIncident()'),
    ('Charging','Stopping','stopRequested','ownerValid','recordUserStopReason()'),
    ('Charging','Stopping','targetReached','','recordCompletedReason()'),
    ('Charging','Stopping','priorityYield','battery >=80% and urgentQueue','recordSchedulerStopReason()'),
    ('Stopping','Complete','powerOffConfirmed','matchingAck','persistSessionOutcome()'),
    ('Stopping','Fault','stopTimeout','threeAttemptsExhausted','doNotReportSuccess()'),
    ('Complete','Idle','unplugConfirmed','noFault','releaseConnector()'),
    ('Service','Fault','electricalFault','','cutSupplyAndOpenIncident()'),
    ('Fault','Repair','repairAssigned','powerOffConfirmed','interruptSessionAndRequeueTechnicalFault()'),
    ('Repair','Idle','repairAccepted','testPassed and unplugged','requeueTechnicalInterruptions()'),
    ('Repair','Fault','safetyTestFailed','','keepQuarantined()'),
    ('Repair','Retired','retireApproved','supplyOff and noAllocation','archiveHistory()'),
    ('Retired','final','','',''),
  ]),
 ('SC03-Reservation_and_Trip_State_Machine', 'Reservation and Trip Lifecycle', 'UC03, UC04, UC05, UC11A',
  {'Active': 'Active Trip'}, [
    state('Reserved', 'Reserved', 'entry / holdVehicleUntilExpiresAt()', 'do: awaitPickupOrExpiry()'),
    state('Unlocking', 'Pickup Claimed', 'entry / suspendExpiryRelease()', 'do: retryUnlockSameIDUpTo3Times()'),
    state('Riding', 'In-Use', 'do: recordDurationAndDistance()', group='Active'),
    state('Reported', 'Incident Reported', 'entry / notifyOperatorAfterCommit()', 'do: preserveActiveTrip()', group='Active'),
    state('Reconciliation', 'Pickup Uncertain', 'entry / blockAllocation()', 'do: reconcileLockAndLocation()'),
    state('Completed', 'Completed', 'entry / saveReturnSummary()', 'do: retainHistoryWithoutPayment()'),
    state('Cancelled', 'Cancelled', 'entry / releaseOwnVehicleHold()'),
    state('Expired', 'Expired', 'entry / releaseOwnVehicleHold()'),
  ], [
    ('initial','Reserved','','',''),
    ('Reserved','Unlocking','pickupClaimed','ownerAndHubValid and now < expiresAt','serializeWithExpiry()'),
    ('Reserved','Cancelled','cancelCommitted','notPickupClaimed','cancelReservation()'),
    ('Reserved','Expired','expiryReached','now >= expiresAt and notPickupClaimed','expireReservation()'),
    ('Unlocking','Riding','unlockConfirmed','matchingAck','consumeReservationAndStartTrip()'),
    ('Unlocking','Reconciliation','unlockTimeout','threeAttemptsExhausted','openIncident()'),
    ('Reconciliation','Cancelled','lockedAtSourceConfirmed','noTripStarted','releaseOnlyAfterReconciliation()'),
    ('Reconciliation','Riding','unlockedPickupConfirmed','samePickupAndVehicle','recoverOriginalTripStart()'),
    ('Riding','Reported','incidentSubmitted','ownerValid','saveIncidentIdempotently()'),
    ('Active','Completed','safeReturnConfirmed','vehicleID and usableSlot and lockConfirmed','closeTripAndOccupySlot()'),
    ('Completed','final','','',''), ('Cancelled','final','','',''), ('Expired','final','','',''),
  ]),
]

COMMON = 'html=0;fontFamily=Segoe UI;fontSize=14;fontColor=#000000;strokeColor=#000000;strokeWidth=1.5;'


def cell(root, id, text, style, x, y, w, h, parent='1'):
    c = ET.SubElement(root, 'mxCell', id=id, value=text, style=style, vertex='1', parent=parent)
    ET.SubElement(c, 'mxGeometry', x=str(x), y=str(y), width=str(w), height=str(h), **{'as':'geometry'})
    return c


def model(title):
    doc = ET.Element('mxfile', host='drawio', version='26.0.0')
    diagram = ET.SubElement(doc, 'diagram', id=title.split()[0], name=title)
    root = ET.SubElement(ET.SubElement(diagram, 'mxGraphModel', grid='1', page='0', background='#ffffff'), 'root')
    ET.SubElement(root, 'mxCell', id='0')
    ET.SubElement(root, 'mxCell', id='1', parent='0')
    return doc, root


def edge(root, id, src, dst, label='', points=(), ports='', dashed=False, offset=(0,0)):
    style = COMMON + 'endArrow=block;endFill=1;rounded=0;edgeStyle=none;jumpStyle=arc;jumpSize=8;' + ports
    if dashed: style += 'dashed=1;endArrow=open;endFill=0;'
    c = ET.SubElement(root, 'mxCell', id=id, value='', style=style, edge='1', parent='1', source=src, target=dst)
    g = ET.SubElement(c, 'mxGeometry', relative='1', **{'as':'geometry'})
    if points:
        arr = ET.SubElement(g, 'Array', **{'as':'points'})
        for x,y in points: ET.SubElement(arr, 'mxPoint', x=str(x), y=str(y))
    if label:
        label='\n'.join(textwrap.wrap(label,38,break_long_words=False))
        c = cell(root, 'label_'+id, label, COMMON+'edgeLabel;align=center;verticalAlign=middle;labelBackgroundColor=#ffffff;resizable=0;fontSize=12;', 0,0,0,0,id)
        g = c.find('mxGeometry'); g.attrib.clear(); g.set('relative','1'); g.set('as','geometry')
        ET.SubElement(g, 'mxPoint', x=str(offset[0]), y=str(offset[1]), **{'as':'offset'})


def flatten(steps):
    nodes, edges, puml = [], [], []
    def new(kind, lane, text):
        id = 'n'+str(len(nodes)); nodes.append(dict(id=id,type=kind,lane=lane,text=text)); return id
    def walk(seq, incoming):
        for step in seq:
            kind, lane, text, *rest = step
            id = new(kind,lane,text)
            for src,label in incoming: edges.append((src,id,label))
            puml.append('|'+lanes[lane]+'|')
            if kind == 'decision':
                guard,yes,no=rest
                puml.append(f'if ({text}) then ({guard})')
                yes_out=walk(yes,[(id,guard)])
                puml.append('else ([else])')
                no_out=walk(no,[(id,'[else]')])
                puml.append('endif')
                incoming=yes_out+no_out
                if len(incoming)>1:
                    merge=new('merge',lane,'')
                    for src,label in incoming:edges.append((src,merge,label))
                    incoming=[(merge,'')]
            elif kind == 'fork':
                puml.append('fork'); left=walk(rest[0],[(id,'')])
                puml.append('fork again'); right=walk(rest[1],[(id,'')])
                puml.append('end fork'); join=new('join',lane,'')
                for src,label in left+right:edges.append((src,join,label))
                incoming=[(join,'')]
            elif kind == 'end':
                puml.append('stop'); incoming=[]
            else:
                puml.append(':'+text.replace('\n','\\n')+';' + (' <<object>>' if kind=='object' else ''))
                incoming=[(id,'')]
        return incoming
    lanes=flatten.lanes
    start=new('start',0,''); puml.extend(['|'+lanes[0]+'|','start'])
    tails=walk(steps,[(start,'')])
    if tails:
        stop=new('end',0,'')
        for src,label in tails:edges.append((src,stop,label))
        puml.append('stop')
    return nodes,edges,puml


def activity(stem,title,uc,lanes,steps):
    flatten.lanes=lanes
    nodes,edges,puml=flatten(steps)
    doc,root=model(stem[:4]+' '+title)
    lane_w=470
    levels={};occupied=set()
    for n in nodes:
        level=max((levels[src]+1 for src,dst,_ in edges if dst==n['id']),default=0)
        while (n['lane'],level) in occupied:level+=1
        levels[n['id']]=level;occupied.add((n['lane'],level))
    height=240+(max(levels.values())+1)*130
    cell(root,'title',f'{stem[:4]} — {title}\n{uc} | Ch6 p.51–52',COMMON+'text;strokeColor=none;fillColor=none;align=left;fontSize=20;fontStyle=1;',30,10,lane_w*len(lanes),65)
    for i,lane in enumerate(lanes):
        cell(root,f'lane_{i}',lane,COMMON+'swimlane;startSize=45;fillColor=#e0f2fe;swimlaneFillColor=#ffffff;pointerEvents=0;collapsible=0;fontSize=18;fontStyle=1;',30+i*lane_w,85,lane_w,height-85)
    coords={}
    for index,n in enumerate(nodes):
        typ=n['type']; text=n['text']; w,h=300,80
        if typ in ('start','end'):w=h=24
        if typ in ('decision','merge'):w,h=(240,90) if typ=='decision' else (26,26)
        if typ in ('fork','join'):w,h=240,9
        x=30+n['lane']*lane_w+(lane_w-w)/2; y=160+levels[n['id']]*130
        coords[n['id']]=(x,y,w,h)
        style=COMMON+'whiteSpace=wrap;fillColor=#e0f2fe;rounded=1;arcSize=20;'
        if typ=='object':style=COMMON+'whiteSpace=wrap;rounded=0;fillColor=#f1f5f9;fontStyle=2;'
        if typ in ('decision','merge'):style=COMMON+'rhombus;whiteSpace=wrap;fillColor=#fef3c7;fontSize=13;'
        if typ in ('start','fork','join'):style=COMMON+'fillColor=#000000;'+('ellipse;' if typ=='start' else '')
        if typ=='end':style=COMMON+'shape=endState;fillColor=#000000;'
        cell(root,n['id'],text,style,x-(30+n['lane']*lane_w),y-85,w,h,f'lane_{n["lane"]}')
    node_map={n['id']:n for n in nodes}
    for i,(src,dst,label) in enumerate(edges):
        x,y,w,h=coords[src]; tx,ty,tw,th=coords[dst]
        adjacent=levels[dst]==levels[src]+1
        outgoing=[e for e in edges if e[0]==src];incoming=[e for e in edges if e[1]==dst]
        ex,ey,ix,iy=.5,1,.5,0
        if node_map[src]['lane']!=node_map[dst]['lane']:
            ex=.4+(i%11)*.02;ix=.4+((i+5)%11)*.02
        if node_map[src]['type']=='fork':ex=.25+.5*outgoing.index((src,dst,label))
        if node_map[dst]['type'] in ('merge','join'):ix=(incoming.index((src,dst,label))+1)/(len(incoming)+1)
        if node_map[src]['type']=='decision':
            ex,ey=(1,.5) if label=='[else]' else (.5,1)
            if label=='[else]' and node_map[dst]['type'] not in ('merge','join'):ix=.7
        sx,sy=x+w*ex,y+h*ey;dx,dy=tx+tw*ix,ty+th*iy
        points=[]
        if adjacent:
            if ey==.5:
                side=x+w+16+i*.6 if ex==1 else x-16-i*.6
                mid=ty-12-i*.65
                points=[(side,sy),(side,mid),(dx,mid)]
            elif sx!=dx:
                mid=y+h+(ty-y-h)*(.2+.6*i/len(edges))
                points=[(sx,mid),(dx,mid)]
        else:
            # Route skip/branch edges through a lane gutter, outside action boxes.
            gutter=30+node_map[src]['lane']*lane_w+lane_w-12-i*.9
            if ex==.5:points.append((sx,y+h+14))
            else:ex,ey=1,.5;sx,sy=x+w,y+h/2
            band=ty-12-i*.65
            points.extend([(gutter,points[-1][1] if points else sy),(gutter,band),(dx,band)])
        ports=f'exitX={ex};exitY={ey};entryX={ix};entryY={iy};'
        edge(root,f'e{i}',src,dst,label,points,ports,node_map[src]['type']=='object' or node_map[dst]['type']=='object')
    file=ACT/(stem+'.drawio');ET.ElementTree(doc).write(file,encoding='utf-8',xml_declaration=True)
    mm=['flowchart TD']
    for i,lane in enumerate(lanes):
        mm.append(f'  subgraph lane{i}["{lane}"]')
        for n in nodes:
            if n['lane']!=i:continue
            t=n['text'].replace('\n','<br/>').replace('"','&quot;')
            if n['type'] in ('start','end'):shape='(("'+('●' if n['type']=='start' else '◉')+'"))'
            elif n['type'] in ('decision','merge'):shape='{"'+(t or ' ')+'"}'
            elif n['type']=='object':shape='["'+t+'"]'
            elif n['type'] in ('fork','join'):shape='[" "]'
            else:shape='("'+t+'")'
            mm.append('    '+n['id']+shape)
        mm.append('  end')
    for src,dst,label in edges:
        arrow='-.->' if node_map[src]['type']=='object' or node_map[dst]['type']=='object' else '-->'
        mm.append(f'  {src} {arrow} '+(f'|"{label}"| ' if label else '')+dst)
    bars=[n['id'] for n in nodes if n['type'] in ('fork','join')]
    if bars:mm.extend(['  classDef bar fill:#000,stroke:#000,color:#000;', '  class '+','.join(bars)+' bar;'])
    return nodes,edges, '\n'.join(['@startuml',f'title {title}','skinparam activity {','  BackgroundColor #e0f2fe','  BorderColor black','}',*puml,'@enduml']), '\n'.join(mm)


def transition_label(t):
    _,_,event,guard,action=t
    return event+(f' [{guard}]' if guard else '')+(f' / {action}' if action else '')


def statechart(stem,title,uc,groups,states,transitions):
    from statechart_layout import LAYOUTS
    layout=LAYOUTS[stem[:4]]
    augmented=[dict(id='initial',type='initial',group='',name='',actions=[]), *states,dict(id='final',type='final',group='',name='',actions=[])]
    doc,root=model(stem[:4]+' '+title)
    cell(root,'title',f'{stem[:4]}  /  {title}',COMMON+'text;strokeColor=none;fillColor=none;align=left;fontSize=24;fontStyle=1;',80,10,1400,40)
    cell(root,'subtitle',f'{uc}  ·  CO3001 Ch6 p.41–45  ·  SoC = battery level  ·  ACK = device acknowledgement',COMMON+'text;strokeColor=none;fillColor=none;align=left;fontSize=13;',80,52,1450,24)
    boxes=layout['groups']|layout['nodes']
    for group,name in groups.items():
        cell(root,group,name,COMMON+'swimlane;rounded=1;arcSize=6;startSize=38;fillColor=#e0f2fe;swimlaneFillColor=#f8fafc;strokeColor=#0284c7;pointerEvents=0;collapsible=0;fontSize=17;fontStyle=1;align=left;spacingLeft=14;',*boxes[group])
    for s in augmented:
        x,y,w,h=boxes[s['id']]
        parent=s['group'] or '1';px,py=boxes[parent][:2] if parent!='1' else (0,0)
        if s['type']=='state':
            color='#dbeafe' if s['group'] else '#e2e8f0'
            if s['id'] in ('Faulty','Fault','Reconciliation'):color='#fee2e2'
            if s['id'] in ('Maintenance','Repair'):color='#fef3c7'
            if s['id'] in ('Completed','Complete'):color='#dcfce7'
            cell(root,s['id'],s['name'],COMMON+f'swimlane;rounded=1;arcSize=10;startSize=32;fillColor={color};swimlaneFillColor=#ffffff;collapsible=0;fontStyle=1;fontSize=16;',x-px,y-py,w,h,parent)
            cell(root,'body_'+s['id'],'\n'.join(s['actions']),COMMON+'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=10;fontSize=12;',0,40,w,h-40,s['id'])
        else:
            cell(root,s['id'],'',COMMON+('ellipse;' if s['type']=='initial' else 'shape=endState;')+'fillColor=#000000;',x,y,w,h)
    def port(value):
        side=value[0];f=float(value[1:])
        return {'T':(f,0),'B':(f,1),'L':(0,f),'R':(1,f)}[side]
    assert len(transitions)==len(layout['routes'])
    for i,(t,route) in enumerate(zip(transitions,layout['routes'])):
        src,dst=t[:2];source,target,points,label_position,caption=route
        ex,ey=port(source);ix,iy=port(target)
        ports=f'exitX={ex};exitY={ey};entryX={ix};entryY={iy};exitPerimeter=0;entryPerimeter=0;'
        edge(root,f'e{i}',src,dst,'',points,ports)
        ec=root.find(f"mxCell[@id='e{i}']");ec.set('data-contract',transition_label(t));ec.set('data-caption',caption)
        if caption:
            lx,ly=label_position
            lc=cell(root,f'label_e{i}',caption,COMMON+'edgeLabel;align=center;verticalAlign=middle;labelBackgroundColor=#ffffff;fontSize=14;',0,0,0,0,f'e{i}')
            g=lc.find('mxGeometry');g.attrib.clear();g.set('as','geometry');g.set('relative','0');g.set('x',str(lx));g.set('y',str(ly))
    file=STA/(stem+'.drawio');ET.ElementTree(doc).write(file,encoding='utf-8',xml_declaration=True)
    pu=['@startuml',f'title {title}'];mm=['stateDiagram-v2']
    for group,name in groups.items():
        pu.append(f'state "{name}" as {group} {{');mm.append(f'  state "{name}" as {group} {{')
        for s in states:
            if s['group']==group:
                pu.append(f'  state "{s["name"]}" as {s["id"]}');mm.append(f'    state "{s["name"]}" as {s["id"]}')
        pu.append('}');mm.append('  }')
    for s in states:
        if not s['group']:
            pu.append(f'state "{s["name"]}" as {s["id"]}');mm.append(f'  state "{s["name"]}" as {s["id"]}')
        for action in s['actions']:
            pu.append(f'{s["id"]} : {action}');mm.append(f'  {s["id"]} : {action}')
    for t in transitions:
        src,dst=t[:2];src='[*]' if src=='initial' else src;dst='[*]' if dst=='final' else dst
        line=f'{src} --> {dst}'+(' : '+transition_label(t) if transition_label(t) else '')
        pu.append(line);mm.append('  '+line)
    pu.append('@enduml')
    return augmented,transitions,'\n'.join(pu),'\n'.join(mm)


def write_catalog(folder,name,diagrams):
    lines=['# '+name,'', 'Nguồn: `PROJECT_SPECIFICATION.md` §3, `LIFECYCLE_SCENARIOS.md`; slide CO3001 Ch6.',
           'Dữ liệu gốc: `.agent/scripts/generate_process_diagrams.py`. SVG và PNG được render bằng Draw.io thật.', '',
           'PlantUML/Mermaid là bản xem mã; Draw.io là bản ký hiệu chi tiết. PlantUML dùng stereotype `<<object>>` cho nút dữ liệu; Mermaid mô phỏng thanh fork/join bằng ô đen. Không dùng hai bản preview để kiểm tra hình học UML.', '']
    for stem,title,pu,mm in diagrams:
        (folder/(stem+'.puml')).write_text(pu+'\n',encoding='utf-8')
        (folder/(stem+'.mmd')).write_text(mm+'\n',encoding='utf-8')
        lines.extend([f'## {stem[:4]} — {title}', '',f'[Draw.io]({stem}.drawio) · [SVG editable]({stem}.drawio.svg) · [PNG]({stem}.png)', '', '```plantuml',pu,'```','','```mermaid',mm,'```',''])
        if folder==STA:
            from statechart_layout import LAYOUTS
            original=next(d for d in STATES if d[0]==stem)
            lines.extend(['### Bảng đối chiếu nhãn trên hình','', 'Nhãn ngắn chỉ là cách trình bày; dùng điều kiện đầy đủ bên phải khi triển khai hoặc kiểm tra nghiệp vụ. SoC là mức pin; healthy là không có fault; safe trong nhánh repair là testPassed. Mỗi dòng giữ nguyên ID transition trong Draw.io.', '', '| ID | Nhãn trên hình | Hợp đồng đầy đủ |','|---|---|---|'])
            for i,(t,route) in enumerate(zip(original[5],LAYOUTS[stem[:4]]['routes'])):
                lines.append(f'| e{i} | {route[4].replace(chr(10), "<br>") or "completion"} | `{transition_label(t) or "completion"}` |')
            lines.append('')
    (folder/('PLANTUML_ACTIVITY.md' if folder==ACT else 'PLANTUML_STATECHART.md')).write_text('\n'.join(lines),encoding='utf-8')


def check_activity(nodes,edges):
    ids={n['id'] for n in nodes}; assert len(ids)==len(nodes)
    assert sum(n['type']=='start' for n in nodes)==1
    adjacency={id:[] for id in ids}; reverse={id:[] for id in ids}
    for src,dst,label in edges:assert src in ids and dst in ids;adjacency[src].append((dst,label));reverse[dst].append(src)
    for n in nodes:
        outgoing=adjacency[n['id']];incoming=reverse[n['id']]
        if n['type']=='decision':assert len(outgoing)==2 and all(x[1].startswith('[') and x[1].endswith(']') for x in outgoing) and any(x[1]=='[else]' for x in outgoing)
        if n['type']=='fork':assert len(incoming)==1 and len(outgoing)==2 and not any(x[1] for x in outgoing)
        if n['type']=='join':assert len(incoming)==2 and len(outgoing)==1
        if n['type']=='end':assert not outgoing
        else:assert outgoing, n
    def visit(id,seen):
        if id in seen:return
        seen.add(id)
        for dst,_ in adjacency[id]:visit(dst,seen)
    seen=set();visit(nodes[0]['id'],seen);assert seen==ids
    # These activities deliberately have no retry back-edge; bounded device retries are subactions.
    def terminating(id,path):
        assert id not in path
        for dst,_ in adjacency[id]:terminating(dst,path|{id})
    terminating(nodes[0]['id'],set())


def main():
    activity_catalog=[]; state_catalog=[]
    statecharts_only='--statecharts-only' in sys.argv
    for d in ([] if statecharts_only else ACTIVITIES):
        nodes,edges,pu,mm=activity(*d);check_activity(nodes,edges)
        activity_catalog.append((d[0],d[1],pu,mm))
        print('PASS',d[0],len(nodes),'nodes',len(edges),'edges')
    for d in STATES:
        nodes,transitions,pu,mm=statechart(*d)
        ids={n['id'] for n in nodes}|set(d[3]);assert all(t[0] in ids and t[1] in ids for t in transitions)
        assert len({(t[0],t[2],t[3]) for t in transitions if t[0]!='initial'})==len(transitions)-1
        assert all(all(x.startswith(('entry /','do:','exit /')) for x in s['actions']) for s in nodes)
        state_catalog.append((d[0],d[1],pu,mm));print('PASS',d[0],len(nodes),'nodes',len(transitions),'transitions')
    if not statecharts_only:write_catalog(ACT,'Activity — PlantUML & Mermaid',activity_catalog)
    write_catalog(STA,'Statechart — PlantUML & Mermaid',state_catalog)


if __name__=='__main__':main()
