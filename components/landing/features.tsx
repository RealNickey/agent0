"use client";

import { motion } from "motion/react";
import {
  Calendar,
  Mail,
  Cloud,
  CheckSquare,
  Search,
  BarChart3,
  Zap,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Smart Calendar",
    description:
      "Intelligent scheduling that learns your preferences and optimizes your time.",
  },
  {
    icon: Mail,
    title: "Email Management",
    description:
      "Draft, summarize, and organize emails with AI-powered assistance.",
  },
  {
    icon: Cloud,
    title: "Weather Updates",
    description:
      "Get real-time weather forecasts and receive smart clothing suggestions.",
  },
  {
    icon: CheckSquare,
    title: "Task Automation",
    description:
      "Create, prioritize, and track tasks with intelligent reminders.",
  },
  {
    icon: Search,
    title: "Web Research",
    description:
      "Search and summarize information from across the web instantly.",
  },
  {
    icon: BarChart3,
    title: "Data Analysis",
    description:
      "Analyze data and generate insights with natural language queries.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Powered by Gemini Flash for instant responses and seamless interactions.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Enterprise-grade security with end-to-end encryption for your data.",
  },
];

export function Features() {
  return (
    <section className="relative py-24" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need,{" "}
            <span className="text-muted-foreground">one assistant</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Agent0 integrates with your favorite tools and services to provide a
            seamless productivity experience.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-border hover:bg-card hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
