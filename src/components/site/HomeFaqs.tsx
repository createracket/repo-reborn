import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

type Faq = { id: string; question: string; answer: string };

export function HomeFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);

  useEffect(() => {
    supabase
      .from("faqs" as any)
      .select("id,question,answer")
      .eq("published", true)
      .order("position", { ascending: true })
      .then(({ data }) => setFaqs(((data as any[]) ?? []) as Faq[]));
  }, []);

  if (faqs.length === 0) return null;

  return (
    <section id="faqs" className="container mx-auto px-4 py-16 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center font-headline text-4xl tracking-tighter md:text-5xl">
          FAQs
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left text-base md:text-lg">
                {f.question}
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-line text-base text-muted-foreground">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
