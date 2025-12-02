import type { AlertRule, NetworkEvent, AlertAction } from '../types';

/**
 * Evaluates if a network event matches an alert rule
 */
export function evaluateRule(rule: AlertRule, event: NetworkEvent): boolean {
  if (!rule.enabled) return false;

  // Get the field value from the event
  let fieldValue: string | number;
  switch (rule.field) {
    case 'anomaly_score':
      fieldValue = event.anomaly_score;
      break;
    case 'flows':
      fieldValue = event.flows;
      break;
    case 'proto':
      fieldValue = event.proto;
      break;
    case 'src':
      fieldValue = event.src;
      break;
    case 'dst':
      fieldValue = event.dst;
      break;
    case 'src_port':
      fieldValue = event.src_port || 0;
      break;
    case 'dst_port':
      fieldValue = event.dst_port || 0;
      break;
    default:
      return false;
  }

  // Evaluate the condition
  const ruleValue = rule.value;
  
  switch (rule.condition) {
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue > ruleValue;
    
    case 'less_than':
      return typeof fieldValue === 'number' && typeof ruleValue === 'number' && fieldValue < ruleValue;
    
    case 'equals':
      return fieldValue === ruleValue || fieldValue.toString() === ruleValue.toString();
    
    case 'contains':
      return fieldValue.toString().toLowerCase().includes(ruleValue.toString().toLowerCase());
    
    default:
      return false;
  }
}

/**
 * Evaluates all rules against an event and returns matched rules
 */
export function evaluateRules(rules: AlertRule[], event: NetworkEvent): AlertRule[] {
  return rules.filter(rule => evaluateRule(rule, event));
}

/**
 * Gets all unique actions from matched rules
 */
export function getActionsFromRules(matchedRules: AlertRule[]): AlertAction[] {
  const actions = new Set<AlertAction>();
  matchedRules.forEach(rule => {
    rule.actions.forEach(action => actions.add(action));
  });
  return Array.from(actions);
}

/**
 * Gets the highest severity from matched rules
 */
export function getHighestSeverity(matchedRules: AlertRule[]): 'critical' | 'high' | 'medium' | 'low' | null {
  if (matchedRules.length === 0) return null;
  
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  
  return matchedRules.reduce((highest, rule) => {
    return severityOrder[rule.severity] > severityOrder[highest]
      ? rule.severity
      : highest;
  }, matchedRules[0].severity);
}
