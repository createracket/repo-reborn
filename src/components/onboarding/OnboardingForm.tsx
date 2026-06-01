import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { parseVibeIntro } from "@/lib/vibe-intro.functions";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import formData from "@/lib/forms.json";
import { cn } from "@/lib/utils";

type Flow = "musician" | "brand";

// ---------- Schemas ----------
const musicianSchema = z
  .object({
    name: z.string().min(2, "Please enter your name/artist name."),
    artistType: z.array(z.string()).min(1, "Please select at least one option"),
    recordContract: z.string().min(1, "Please select your record contract status"),
    recordLabel: z.string().optional(),
    interests: z.array(z.string()).min(3, "Please select at least 3 interests"),
    contentComfortLevel: z.string().min(1, "Please rate your comfort level"),
    story: z.string().optional(),
    creativeAesthetic: z.string().optional(),
    goals: z.array(z.string()).min(1, "Please select at least one goal."),
    support: z.array(z.string()).min(1, "Please select what support you need."),
    sustainabilityImportance: z.string().min(1, "This field is required."),
    ecoConsciousBrands: z.string().min(1, "This field is required."),
    representationImportance: z.string().min(1, "This field is required."),
    underrepresentedCommunities: z.array(z.string()).optional(),
    readyToCreateRacket: z.string().min(1, "Please select an option"),
  })
  .superRefine((data, ctx) => {
    if (data.recordContract === "Yes" && !data.recordLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordLabel"],
        message: "Please specify your record label.",
      });
    }
  });

const brandSchema = z.object({
  name: z.string().min(2, "Please enter a name."),
  industry: z.string().min(1, "Please select your industry"),
  brandValues: z.array(z.string()).min(3, "Please select at least 3 values."),
  targetAudience: z.array(z.string()).min(1, "Please select at least one audience group."),
  primaryGoal: z.string().min(1, "Please select your primary goal."),
  campaignTypes: z.array(z.string()).min(1, "Select at least one campaign type."),
  budgetRange: z.string().min(1, "Please select a budget range."),
  timeline: z.string().min(1, "Please select a timeline."),
  readyToConnect: z.string().min(1, "Please select an option"),
});

type MusicianData = z.infer<typeof musicianSchema>;
type BrandData = z.infer<typeof brandSchema>;

const MUSICIAN_DEFAULTS: MusicianData = {
  name: "",
  artistType: [],
  recordContract: "",
  recordLabel: "",
  interests: [],
  contentComfortLevel: "",
  story: "",
  creativeAesthetic: "",
  goals: [],
  support: [],
  sustainabilityImportance: "",
  ecoConsciousBrands: "",
  representationImportance: "",
  underrepresentedCommunities: [],
  readyToCreateRacket: "",
};

const BRAND_DEFAULTS: BrandData = {
  name: "",
  industry: "",
  brandValues: [],
  targetAudience: [],
  primaryGoal: "",
  campaignTypes: [],
  budgetRange: "",
  timeline: "",
  readyToConnect: "",
};

// ---------- Component ----------
export function OnboardingForm({ flow }: { flow: Flow }) {
  const navigate = useNavigate();
  const config = (formData as any)[flow];
  const sections = (config.sections as Array<{ title: string; description: string; timeEstimate: string }>).slice(1);
  const totalSections = config.totalSections - 1;
  const fields = config.fields as Record<
    string,
    {
      section: number;
      type: "text" | "textarea" | "checkbox" | "radio";
      label: string;
      placeholder?: string;
      description?: string;
      options?: string[];
      dependsOn?: string;
      dependsOnValue?: string;
    }
  >;

  const sectionFields = useMemo(() => {
    const map: Record<number, string[]> = {};
    Object.entries(fields).forEach(([key, value]) => {
      const adjusted = value.section - 1;
      if (adjusted > 0) {
        if (!map[adjusted]) map[adjusted] = [];
        map[adjusted].push(key);
      }
    });
    return map;
  }, [fields]);

  const [currentSection, setCurrentSection] = useState(1);

  const form = useForm<any>({
    resolver: zodResolver((flow === "musician" ? musicianSchema : brandSchema) as any) as any,
    defaultValues: (flow === "musician" ? MUSICIAN_DEFAULTS : BRAND_DEFAULTS) as any,
    mode: "onChange",
  });

  async function onSubmit(data: any) {
    try {
      sessionStorage.setItem(
        "vibeCheck",
        JSON.stringify({ flow, data, at: Date.now() })
      );
    } catch {
      toast.error("Couldn't save your answers locally. Try again.");
      return;
    }
    navigate({ to: "/results" });
  }

  async function nextSection() {
    const fieldsToValidate = sectionFields[currentSection] || [];
    const isValid = await form.trigger(fieldsToValidate as any, { shouldFocus: true });
    if (isValid && currentSection < totalSections) {
      setCurrentSection(currentSection + 1);
    }
  }

  function prevSection() {
    if (currentSection > 1) setCurrentSection(currentSection - 1);
  }

  const section = sections[currentSection - 1];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{section?.timeEstimate}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSections }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i + 1 <= currentSection ? "bg-primary w-6" : "bg-muted w-2"
                )}
              />
            ))}
          </div>
        </div>
        <CardTitle className="font-display text-3xl pt-2">{section?.title}</CardTitle>
        <CardDescription>{section?.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8">
              {(sectionFields[currentSection] || []).map((fieldName) => (
                <FieldRenderer key={fieldName} name={fieldName} config={fields[fieldName]} form={form} />
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <Button type="button" variant="outline" onClick={prevSection} disabled={currentSection === 1}>
                Previous
              </Button>
              {currentSection < totalSections ? (
                <Button type="button" onClick={nextSection}>
                  Next Section
                </Button>
              ) : (
                <Button type="submit">
                  {flow === "musician" ? "See My Vibe 🎵" : "See My Vibe ✨"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ---------- Field renderer ----------
interface FieldConfig {
  section: number;
  type: "text" | "textarea" | "checkbox" | "radio";
  label: string;
  placeholder?: string;
  description?: string;
  options?: string[];
  dependsOn?: string;
  dependsOnValue?: string;
}

function FieldRenderer({
  name,
  config,
  form,
}: {
  name: string;
  config: FieldConfig;
  form: UseFormReturn<any>;
}) {
  if (config.dependsOn && form.watch(config.dependsOn) !== config.dependsOnValue) {
    return null;
  }

  if (config.type === "text") {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">{config.label}</FormLabel>
            <FormControl>
              <Input placeholder={config.placeholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (config.type === "textarea") {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">{config.label}</FormLabel>
            <FormControl>
              <Textarea placeholder={config.placeholder} rows={5} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (config.type === "checkbox" && config.options) {
    const options = config.options;
    return (
      <FormField
        control={form.control}
        name={name}
        render={() => (
          <FormItem>
            <div>
              <FormLabel className="text-base font-medium">
                {config.label} <span className="text-coral">*</span>
              </FormLabel>
              {config.description && (
                <FormDescription className="text-sm text-muted-foreground block">
                  {config.description}
                </FormDescription>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {options.map((item) => (
                <FormField
                  key={item}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-border/60 p-3 hover:border-primary/60 transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={(field.value as string[])?.includes(item)}
                          onCheckedChange={(checked) => {
                            const current = (field.value as string[]) || [];
                            return checked
                              ? field.onChange([...current, item])
                              : field.onChange(current.filter((v) => v !== item));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">{item}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (config.type === "radio" && config.options) {
    const options = config.options;
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel className="text-base font-medium">
              {config.label} <span className="text-coral">*</span>
            </FormLabel>
            {config.description && (
              <FormDescription className="text-sm text-muted-foreground block">
                {config.description}
              </FormDescription>
            )}
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value as string}
                className="space-y-2"
              >
                {options.map((option) => {
                  const id = `${name}-${option.replace(/\s+/g, "-").toLowerCase()}`;
                  return (
                    <FormItem
                      key={option}
                      className="flex items-center space-x-2 rounded-md border border-border/60 p-3 hover:border-primary/60 transition-colors"
                    >
                      <FormControl>
                        <RadioGroupItem value={option} id={id} />
                      </FormControl>
                      <Label htmlFor={id} className="text-sm font-normal cursor-pointer flex-1">
                        {option}
                      </Label>
                    </FormItem>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return null;
}
