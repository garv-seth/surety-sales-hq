'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COLD_CALL_SCRIPTS, COLD_TEXT_TEMPLATES, COLD_EMAIL, FOLLOW_UP_SCRIPTS } from '@/lib/surety-content';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="h-7 text-xs">
      {copied ? '✓ Copied!' : '📋 Copy'}
    </Button>
  );
}

export default function TemplatesPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Outreach Templates</h1>
        <p className="text-slate-500 mt-1">Copy and use these scripts for cold outreach</p>
      </div>

      <Tabs defaultValue="cold-call">
        <TabsList className="mb-6">
          <TabsTrigger value="cold-call">Cold Call</TabsTrigger>
          <TabsTrigger value="cold-text">Cold Text</TabsTrigger>
          <TabsTrigger value="cold-email">Cold Email</TabsTrigger>
          <TabsTrigger value="follow-up">Follow-Up</TabsTrigger>
        </TabsList>

        <TabsContent value="cold-call">
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(COLD_CALL_SCRIPTS).map(([key, { title, script }]) => (
              <Card key={key} className="rounded-xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{title} Script</CardTitle>
                    <CopyButton text={script} />
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-lg p-4">
                    {script}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cold-text">
          <div className="grid grid-cols-1 gap-4">
            {COLD_TEXT_TEMPLATES.map((tmpl) => (
              <Card key={tmpl.type} className="rounded-xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tmpl.type}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{tmpl.text.length} chars</span>
                      <CopyButton text={tmpl.text} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4">{tmpl.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cold-email">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cold Email</CardTitle>
                <CopyButton text={`Subject: ${COLD_EMAIL.subject}\n\n${COLD_EMAIL.body}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</span>
                  <p className="text-sm font-medium text-slate-800 mt-1">{COLD_EMAIL.subject}</p>
                </div>
                <hr />
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {COLD_EMAIL.body}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="follow-up">
          <div className="grid grid-cols-1 gap-4">
            {FOLLOW_UP_SCRIPTS.map((script) => (
              <Card key={script.title} className="rounded-xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{script.title}</CardTitle>
                    <CopyButton text={script.script} />
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-lg p-4">
                    {script.script}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
