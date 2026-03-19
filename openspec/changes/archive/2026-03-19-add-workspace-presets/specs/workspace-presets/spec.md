## ADDED Requirements

### Requirement: User can save a workspace preset from recent project selection
The system SHALL allow the user to save the currently selected recent repositories as a named workspace preset before opening them.

#### Scenario: Save selected repositories as a new preset
- **WHEN** the user selects one or more recent repositories and chooses the save-as-preset action
- **THEN** the system prompts for a preset name
- **AND** stores the preset with the selected repository paths in local persistent storage
- **AND** continues to open the selected repositories

#### Scenario: Reject duplicate preset name during save
- **WHEN** the user enters a preset name that already exists
- **THEN** the system MUST reject the name
- **AND** show a validation message that the preset name is already in use

### Requirement: User can open projects from a saved workspace preset
The system SHALL provide a startup mode that lists saved workspace presets and opens the repositories stored in the selected preset.

#### Scenario: Open a saved preset
- **WHEN** the user chooses the workspace preset mode and selects a saved preset
- **THEN** the system opens the repositories from that preset in iTerm2 using the configured launch command

#### Scenario: Skip invalid paths when opening a preset
- **WHEN** the selected preset contains repository paths that no longer exist
- **THEN** the system MUST exclude the invalid paths from the launch set
- **AND** inform the user that some preset entries were skipped

#### Scenario: Block opening when all preset paths are invalid
- **WHEN** the selected preset contains no existing repository paths
- **THEN** the system MUST stop the launch flow
- **AND** show an error explaining that the preset has no valid repositories

### Requirement: User can manage saved workspace presets
The system SHALL provide preset management actions for viewing, renaming, and deleting saved workspace presets.

#### Scenario: Rename a preset
- **WHEN** the user chooses the rename action for an existing preset and enters a unique new name
- **THEN** the system updates the preset name in persistent storage

#### Scenario: Reject duplicate preset name during rename
- **WHEN** the user attempts to rename a preset to a name already used by another preset
- **THEN** the system MUST reject the new name
- **AND** show a validation message that the preset name is already in use

#### Scenario: Delete a preset
- **WHEN** the user chooses the delete action for an existing preset and confirms the action
- **THEN** the system removes the preset from persistent storage

#### Scenario: Handle empty preset list in management flow
- **WHEN** the user enters preset management and no presets are saved
- **THEN** the system informs the user that no presets exist
- **AND** does not present rename or delete actions
