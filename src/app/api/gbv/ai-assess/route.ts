// src/app/api/gbv/ai-assess/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`);
  const data = await res.json();
  return data.content?.map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('') ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      caseId, incidentType, description, victimAge, victimGender,
      victimInjured, perpetratorKnown, perpetratorRelation,
      perpetratorArrested, location, priorCases = 0,
    } = body;

    if (!incidentType || !description) {
      return NextResponse.json({ success: false, error: 'incidentType and description are required' }, { status: 400 });
    }

    const prompt = `You are an expert GBV (Gender-Based Violence) case analyst for the Kenya Police Service.
Analyze the following case details and provide a structured JSON assessment.

CASE DETAILS:
- Incident Type: ${incidentType.replace(/_/g, ' ')}
- Description: ${description}
- Victim Age: ${victimAge ?? 'Unknown'}
- Victim Gender: ${victimGender ?? 'Unknown'}
- Victim Injured: ${victimInjured ? 'Yes' : 'No'}
- Perpetrator Known: ${perpetratorKnown ? 'Yes' : 'No'}
- Perpetrator Relation to Victim: ${perpetratorRelation ?? 'Unknown'}
- Perpetrator Arrested: ${perpetratorArrested ? 'Yes' : 'No'}
- Location: ${location ?? 'Not specified'}
- Prior GBV cases at this location: ${priorCases}

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "riskFactors": ["<factor1>", "<factor2>"],
  "recurrenceRisk": <float 0.0-1.0>,
  "aiSummary": "<2-3 sentence professional case summary>",
  "aiRecommendations": "<numbered actionable recommendations for officers>",
  "urgentActions": ["<action1>"],
  "supportResources": ["<resource type and reason>"]
}

Risk guide: CRITICAL(80-100)=immediate danger/child victim, HIGH(60-79)=known perpetrator at large/serious injury, MEDIUM(40-59)=moderate risk, LOW(0-39)=perpetrator arrested/resolved`;

    const raw = await callClaude(prompt);
    let assessment: {
      riskScore: number; riskLevel: string; riskFactors: string[];
      recurrenceRisk: number; aiSummary: string; aiRecommendations: string;
      urgentActions: string[]; supportResources: string[];
    };

    try {
      assessment = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      assessment = {
        riskScore: 50, riskLevel: 'MEDIUM',
        riskFactors: ['Manual review required'],
        recurrenceRisk: 0.5,
        aiSummary: 'AI assessment could not be fully processed. Manual officer review required.',
        aiRecommendations: '1. Conduct immediate assessment\n2. Ensure victim safety\n3. Document evidence\n4. Connect with support services\n5. Escalate to senior officer',
        urgentActions: ['Manual review required'],
        supportResources: ['All support types should be evaluated'],
      };
    }

    assessment.riskScore     = Math.max(0, Math.min(100, Math.round(assessment.riskScore)));
    assessment.recurrenceRisk = Math.max(0, Math.min(1, assessment.recurrenceRisk));

    if (caseId) {
      await prisma.gBVCase.update({
        where: { id: caseId },
        data: {
          riskScore:         assessment.riskScore,
          riskLevel:         assessment.riskLevel as any,
          aiSummary:         assessment.aiSummary,
          aiRecommendations: assessment.aiRecommendations,
          recurrenceRisk:    assessment.recurrenceRisk,
        },
      });
    }

    return NextResponse.json({ success: true, data: assessment });
  } catch (error) {
    console.error('[POST /api/gbv/ai-assess]', error);
    return NextResponse.json({ success: false, error: 'AI assessment failed' }, { status: 500 });
  }
}