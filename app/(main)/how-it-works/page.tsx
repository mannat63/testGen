import Link from 'next/link';
import { ArrowLeft, BookOpen, Settings2, FileText, Download } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center py-10 px-5 sm:px-6 md:px-10">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="p-2 rounded-full bg-brand-card border border-brand-border hover:bg-brand-gold/10 text-brand-muted hover:text-brand-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              How <span className="text-brand-gold">Intellogy</span> Works
            </h1>
            <p className="text-brand-muted text-sm mt-1">
              Your comprehensive guide to generating board-perfect test papers seamlessly.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          
          {/* Step 1 */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">1. Select Board & Subject</h2>
              <p className="text-brand-muted leading-relaxed mb-4">
                Start by selecting the academic board (e.g., CBSE, GSEB, JEE, NEET) and the subject you want to create a test for. Our system instantly loads the relevant, up-to-date question bank tailored to that specific curriculum.
              </p>
              <ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
                <li>Access to thousands of verified questions.</li>
                <li>Questions categorized strictly by syllabus guidelines.</li>
                <li>Multi-language support for regional boards like GSEB.</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
              <Settings2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">2. Configure the Pattern</h2>
              <p className="text-brand-muted leading-relaxed mb-4">
                Customize the structure of your paper to meet your exact needs. You have full control over the difficulty levels, question types, and the weightage of each chapter.
              </p>
              <ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
                <li><strong>Difficulty Ratios:</strong> Balance the paper by setting percentages for Easy, Medium, and Hard questions.</li>
                <li><strong>Chapter Weightage:</strong> Assign specific marks to chapters. The AI algorithm will intelligently distribute questions to match these marks.</li>
                <li><strong>Question Types:</strong> Mix MCQs, Short Answers, and Long Answers seamlessly.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">3. Generate Unique Variants</h2>
              <p className="text-brand-muted leading-relaxed mb-4">
                Need multiple sets to prevent cheating? Our advanced algorithm can generate Set A, Set B, and Set C simultaneously. All sets maintain the exact same difficulty and chapter weightage, but with completely shuffled questions and options.
              </p>
              <div className="bg-background/50 border border-brand-border rounded-lg p-4 text-sm text-brand-muted">
                <strong className="text-foreground">Pro Tip:</strong> We guarantee no duplicate questions within a single paper to ensure the highest quality of assessment.
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
              <Download className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">4. Review and Export</h2>
              <p className="text-brand-muted leading-relaxed mb-4">
                Preview your generated paper in a clean, distraction-free view. Notice a typo or want to make a quick adjustment? You can edit the text directly on the screen before exporting.
              </p>
              <ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
                <li><strong>Export as PDF:</strong> Perfect for direct printing.</li>
                <li><strong>Export as DOC:</strong> Ideal if you want to make structural changes in Microsoft Word later.</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Call to action */}
        <div className="flex justify-center pt-4">
          <Link href="/" className="bg-brand-gold text-background font-bold px-8 py-3 rounded-xl hover:bg-[#c19b28] transition-colors shadow-lg shadow-brand-gold/20">
            Start Generating Now
          </Link>
        </div>

      </div>
    </div>
  );
}
