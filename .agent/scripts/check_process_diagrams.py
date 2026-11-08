"""Check the retained activity/statechart sources and their coverage."""
from check_diagram_sources import check
from generate_process_diagrams import ACTIVITIES, STATES, ACT, STA


if __name__ == '__main__':
    files = []
    for folder, diagrams in ((ACT, ACTIVITIES), (STA, STATES)):
        expected = {diagram[0] for diagram in diagrams}
        native = sorted((folder / 'drawio').glob('*.drawio'))
        assert {file.stem for file in native} == expected
        files.extend(native)
    check(files)
