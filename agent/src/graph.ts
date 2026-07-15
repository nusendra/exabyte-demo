import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from './state.js';
import {
  afterVerify,
  createPRNode,
  fetchTask,
  implementNode,
  planNode,
  prepareBranch,
  reportFailureNode,
  updateClickupNode,
  verifyNode,
  writeTestNode
} from './nodes.js';

export function buildGraph() {
  return new StateGraph(AgentState)
    .addNode('fetchTask', fetchTask)
    .addNode('planChange', planNode)
    .addNode('prepareBranch', prepareBranch)
    .addNode('writeTest', writeTestNode)
    .addNode('implement', implementNode)
    .addNode('verify', verifyNode)
    .addNode('createPR', createPRNode)
    .addNode('updateClickup', updateClickupNode)
    .addNode('reportFailure', reportFailureNode)
    .addEdge(START, 'fetchTask')
    .addEdge('fetchTask', 'planChange')
    .addEdge('planChange', 'prepareBranch')
    .addEdge('prepareBranch', 'writeTest')
    .addEdge('writeTest', 'implement')
    .addEdge('implement', 'verify')
    .addConditionalEdges('verify', afterVerify, {
      createPR: 'createPR',
      implement: 'implement',
      reportFailure: 'reportFailure'
    })
    .addEdge('createPR', 'updateClickup')
    .addEdge('updateClickup', END)
    .addEdge('reportFailure', END)
    .compile();
}
