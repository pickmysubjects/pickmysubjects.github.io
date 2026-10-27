/**
 * The standalone tools, as shown on /tools/ and its static page: each links to the exact place
 * the tool lives. `text` is a one-line description where the label alone isn't enough.
 */
export type ToolGroup = 'calc' | 'list' | 'plan'
export interface Tool {
  key: string
  to: string
  group: ToolGroup
  icon: string
  text?: string
}

export const TOOLS: readonly Tool[] = [
  { key: 'calc.title', to: 'tools/final/', group: 'calc', icon: 'calculator', text: 'tools.final' },
  { key: 'tools.wam', to: 'tools/wam/', group: 'calc', icon: 'gauge', text: 'tools.wamText' },
  { key: 'tools.easy', to: 'subjects/easy/', group: 'list', icon: 'scale' },
  { key: 'tools.hard', to: 'subjects/hard/', group: 'list', icon: 'flame' },
  { key: 'tools.noExam', to: 'subjects/no-exam/', group: 'list', icon: 'file-x' },
  { key: 'tools.summerWinter', to: 'subjects/summer-winter/', group: 'list', icon: 'snowflake' },
  { key: 'tools.breadth', to: 'subjects/breadth/', group: 'list', icon: 'shapes' },
  { key: 'tools.easyL3', to: 'subjects/easy-level-3-breadth/', group: 'list', icon: 'layers' },
  { key: 'tools.firstSem', to: 'subjects/first-semester/', group: 'list', icon: 'sprout' },
  { key: 'tools.compare', to: 'shortlist/', group: 'plan', icon: 'columns' },
  { key: 'tools.routes', to: 'majors/', group: 'plan', icon: 'route' },
  { key: 'tools.careers', to: 'careers/', group: 'plan', icon: 'briefcase' },
  { key: 'tools.keyDates', to: 'guide/key-dates/', group: 'plan', icon: 'calendar' },
]

export const TOOL_GROUPS: readonly { group: ToolGroup; key: string }[] = [
  { group: 'calc', key: 'tools.calcGroup' },
  { group: 'list', key: 'tools.listGroup' },
  { group: 'plan', key: 'tools.planGroup' },
]
