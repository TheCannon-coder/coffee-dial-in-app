/** Human phrasing for adjustment ids, shared by notifications and plan cards. */
export function tweakPhrase(adjustment: string): string {
  switch (adjustment) {
    case 'grind_finer': return 'grind a touch finer';
    case 'grind_coarser': return 'grind a touch coarser';
    case 'more_coffee': return 'use a little more coffee';
    case 'less_coffee': return 'use a little less coffee';
    case 'steep_longer': return 'let it steep a bit longer';
    case 'steep_shorter': return 'cut the steep a bit shorter';
    default: return '';
  }
}
