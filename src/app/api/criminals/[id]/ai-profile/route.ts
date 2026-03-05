// src/app/api/criminals/[id]/ai-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Guard: ensure API key is configured ──────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return NextResponse.json(
        {
          success: false,
          error: 'AI profiling service is not configured. Please set GEMINI_API_KEY in your environment variables.',
        },
        { status: 503 }
      );
    }

    // ── Fetch criminal record ─────────────────────────────────────────────────
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      include: {
        Station: {
          select: {
            id: true,
            name: true,
            code: true,
            county: true,
            subCounty: true,
          },
        },
        cases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            description: true,
            category: true,
            status: true,
            priority: true,
            createdAt: true,
            closedAt: true,
            outcome: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        CriminalEvidence: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal record not found' },
        { status: 404 }
      );
    }

    // ── Build profile context ─────────────────────────────────────────────────
    const profileContext = {
      personalInfo: {
        fullName: `${criminal.firstName}${criminal.middleName ? ' ' + criminal.middleName : ''} ${criminal.lastName}`,
        aliases: criminal.alias,
        gender: criminal.gender,
        nationality: criminal.nationality,
        dateOfBirth: criminal.dateOfBirth,
        idNumber: criminal.idNumber,
        address: criminal.address,
        phoneNumber: criminal.phoneNumber,
        lastKnownLocation: criminal.lastKnownLocation,
      },
      wantedStatus: {
        isWanted: criminal.isWanted,
        wantedReason: criminal.wantedReason,
      },
      station: criminal.Station
        ? {
            name: criminal.Station.name,
            code: criminal.Station.code,
            county: criminal.Station.county,
            subCounty: criminal.Station.subCounty,
          }
        : null,
      cases: criminal.cases.map((c) => ({
        caseNumber: c.caseNumber,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        priority: c.priority,
        createdAt: c.createdAt,
        closedAt: c.closedAt,
        outcome: c.outcome,
      })),
      evidence: {
        totalItems: criminal.CriminalEvidence.length,
        fingerprints: criminal.CriminalEvidence.filter((e) => e.type === 'FINGERPRINT').length,
        photos: criminal.CriminalEvidence.filter((e) => e.type === 'PHOTO').length,
        documents: criminal.CriminalEvidence.filter((e) => e.type === 'DOCUMENT').length,
        other: criminal.CriminalEvidence.filter((e) => e.type === 'OTHER').length,
      },
      criminalHistory: criminal.criminalHistory,
      knownAssociates: criminal.knownAssociates,
      recordAge: {
        createdAt: criminal.createdAt,
        updatedAt: criminal.updatedAt,
        daysSinceCreated: Math.floor(
          (Date.now() - new Date(criminal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    };

    // ── Build prompt ──────────────────────────────────────────────────────────
    const prompt = `You are a senior criminal intelligence analyst for the Kenya Police Service. 
Analyze the following criminal record and provide a comprehensive AI-powered criminal profile.

CRIMINAL RECORD DATA:
${JSON.stringify(profileContext, null, 2)}

Generate a thorough criminal profile with the following JSON structure (respond ONLY with valid JSON, no markdown, no preamble, no backticks):

{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "threatAssessment": {
    "overallThreat": "<brief 1-2 sentence overall threat summary>",
    "publicDangerLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
    "flightRisk": "<LOW|MEDIUM|HIGH>",
    "recidivismProbability": "<LOW|MEDIUM|HIGH>",
    "violencePropensity": "<LOW|MEDIUM|HIGH>"
  },
  "profileSummary": "<detailed 3-5 sentence narrative profile of this individual based on all available data>",
  "behavioralPatterns": [
    "<pattern 1>",
    "<pattern 2>",
    "<pattern 3>"
  ],
  "offenseAnalysis": {
    "primaryOffenseCategory": "<main crime type>",
    "offenseEscalation": "<DECREASING|STABLE|INCREASING|INSUFFICIENT_DATA>",
    "modus_operandi": "<describe known or likely method of operation based on case history>",
    "crimeTimeline": "<analysis of timing patterns if multiple cases exist>"
  },
  "investigationLeads": [
    {
      "priority": "<HIGH|MEDIUM|LOW>",
      "lead": "<specific actionable investigation lead>",
      "rationale": "<why this lead is relevant>"
    }
  ],
  "geographicProfile": {
    "primaryOperatingArea": "<likely operating area based on address, station, location data>",
    "mobilityRisk": "<LOW|MEDIUM|HIGH>",
    "crossCountyRisk": "<boolean-like: true or false as string>",
    "notes": "<geographic analysis notes>"
  },
  "associateNetwork": {
    "networkSize": "<ISOLATED|SMALL|MEDIUM|LARGE>",
    "networkDanger": "<LOW|MEDIUM|HIGH>",
    "notes": "<analysis of known associates if any>"
  },
  "recommendations": [
    {
      "category": "<SURVEILLANCE|INVESTIGATION|PROSECUTION|COMMUNITY|ARREST|OTHER>",
      "action": "<specific recommended action>",
      "urgency": "<IMMEDIATE|SHORT_TERM|LONG_TERM>"
    }
  ],
  "dataQuality": {
    "completenessScore": <integer 0-100>,
    "missingCriticalData": ["<list of important missing data fields>"],
    "confidenceLevel": "<LOW|MEDIUM|HIGH>",
    "notes": "<notes on data quality and how it affects the analysis>"
  },
  "generatedAt": "${new Date().toISOString()}",
  "analystNotes": "<any additional observations or caveats for investigating officers>"
}

Base your analysis ONLY on the provided data. Be factual, objective, and professional.
If data is insufficient for a field, indicate that clearly rather than fabricating information.`;

    // ── Call Google Gemini API ────────────────────────────────────────────────
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Gemini API error:', errText);

      if (aiResponse.status === 400) {
        return NextResponse.json(
          { success: false, error: 'Invalid Gemini API request. Check your GEMINI_API_KEY.' },
          { status: 503 }
        );
      }

      if (aiResponse.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Gemini API key is invalid or lacks permissions. Check your GEMINI_API_KEY.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'AI profiling service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const aiData = await aiResponse.json();

    // ── Extract text from Gemini response structure ───────────────────────────
    const rawText: string =
      aiData?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '';

    if (!rawText) {
      console.error('Empty response from Gemini:', JSON.stringify(aiData));
      return NextResponse.json(
        { success: false, error: 'AI returned an empty response. Please try again.' },
        { status: 500 }
      );
    }

    // ── Parse AI JSON response ────────────────────────────────────────────────
    let profile;
    try {
      // Strip markdown fences in case Gemini adds them despite responseMimeType
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      profile = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', rawText);
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI profile response.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
        criminal: {
          id: criminal.id,
          fullName: `${criminal.firstName}${criminal.middleName ? ' ' + criminal.middleName : ''} ${criminal.lastName}`,
          isWanted: criminal.isWanted,
          caseCount: criminal.cases.length,
          evidenceCount: criminal.CriminalEvidence.length,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error generating AI profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate AI profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}