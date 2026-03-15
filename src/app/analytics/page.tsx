'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, LineChart, Calendar, Download, ChevronDown, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useTranslation } from '@/i18n';

export default function AnalyticsPage() {
  const t = useTranslation();
  // State for time period selection
  const [timePeriod, setTimePeriod] = useState('30days');
  const [showTimeOptions, setShowTimeOptions] = useState(false);

  // Time period options
  const timePeriods = [
    { value: '7days', label: t.analyticsPage.last7Days },
    { value: '30days', label: t.analyticsPage.last30Days },
    { value: '90days', label: t.analyticsPage.last90Days },
    { value: '6months', label: t.analyticsPage.last6Months },
    { value: '1year', label: t.analyticsPage.lastYear },
  ];

  // Get the selected time period label
  const getSelectedTimeLabel = () => {
    return timePeriods.find(period => period.value === timePeriod)?.label || t.analyticsPage.last30Days;
  };

  return (
    <div className="flex flex-col gap-10 px-4 md:px-6 py-6 md:py-10 max-w-7xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight mb-3">{t.analyticsPage.title}</h1>
        <p className="text-muted-foreground max-w-3xl">
          {t.analyticsPage.subtitle}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => setShowTimeOptions(!showTimeOptions)}
            >
              <Calendar className="h-4 w-4" />
              {getSelectedTimeLabel()}
              <ChevronDown className={`h-4 w-4 transition-transform ${showTimeOptions ? 'rotate-180' : ''}`} />
            </Button>
            
            {showTimeOptions && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md border bg-white shadow-lg z-10 animate-in fade-in-50 slide-in-from-top-5 duration-200">
                <div className="py-1">
                  {timePeriods.map(period => (
                    <button
                      key={period.value}
                      className={`flex w-full items-center px-4 py-2 text-sm ${
                        timePeriod === period.value ? 'bg-muted font-medium' : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        setTimePeriod(period.value);
                        setShowTimeOptions(false);
                      }}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-2"
          >
            <Filter className="h-4 w-4" />
            {t.analyticsPage.filter}
          </Button>

          <Button size="sm" className="h-9 gap-2">
            <Download className="h-4 w-4" />
            {t.analyticsPage.exportBtn}
          </Button>
        </div>
      </div>
      
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.analyticsPage.totalTrends, value: '128', change: '+12%', changeType: 'positive' },
          { label: t.analyticsPage.avgGrowthRate, value: '18.5%', change: '+2.3%', changeType: 'positive' },
          { label: t.analyticsPage.engagement, value: '1.2M', change: '+15%', changeType: 'positive' },
          { label: t.analyticsPage.newCategories, value: '7', change: '-1', changeType: 'negative' },
        ].map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <Badge 
                    className={`${
                      stat.changeType === 'positive' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {stat.change}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>{t.analyticsPage.platformDistribution}</CardTitle>
            <CardDescription>
              {t.analyticsPage.platformDistributionDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full rounded-md border bg-muted/30 p-2 relative overflow-hidden group">
              <div className="flex h-full items-center justify-center">
                <PieChart className="h-16 w-16 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t.analyticsPage.platformDistributionChart}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
              <div>
                <div className="h-2 w-full rounded-sm bg-blue-500"></div>
                <span>Instagram</span>
                <p className="font-medium mt-1">38%</p>
              </div>
              <div>
                <div className="h-2 w-full rounded-sm bg-red-500"></div>
                <span>Pinterest</span>
                <p className="font-medium mt-1">24%</p>
              </div>
              <div>
                <div className="h-2 w-full rounded-sm bg-purple-500"></div>
                <span>TikTok</span>
                <p className="font-medium mt-1">28%</p>
              </div>
              <div>
                <div className="h-2 w-full rounded-sm bg-green-500"></div>
                <span>Google</span>
                <p className="font-medium mt-1">10%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>{t.analyticsPage.trendGrowthRate}</CardTitle>
            <CardDescription>
              {t.analyticsPage.trendGrowthRateDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full rounded-md border bg-muted/30 p-2 relative overflow-hidden group">
              <div className="flex h-full items-center justify-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t.analyticsPage.growthRateChart}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {[
                { label: t.analyticsPage.sustainable, value: 18 },
                { label: t.analyticsPage.y2k, value: 24 },
                { label: t.analyticsPage.oversized, value: 15 },
                { label: t.analyticsPage.dopamine, value: 22 },
                { label: t.analyticsPage.digital, value: 28 },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="h-24 w-6 bg-muted rounded-full overflow-hidden flex flex-col-reverse">
                    <div 
                      className="bg-primary w-full transition-all duration-500"
                      style={{ height: `${item.value * 2}%` }}
                    ></div>
                  </div>
                  <span className="text-xs mt-2 text-center">{item.label}</span>
                  <span className="text-xs font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle>{t.analyticsPage.trendPerformance}</CardTitle>
          <CardDescription>
            {t.analyticsPage.trendPerformanceDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-md border bg-muted/30 p-2 relative overflow-hidden group">
            <div className="flex h-full items-center justify-center">
              <LineChart className="h-16 w-16 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t.analyticsPage.trendTimelineChart}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-4">
              {[
                { label: t.analyticsPage.sustainable, color: 'bg-green-500' },
                { label: t.analyticsPage.y2k, color: 'bg-purple-500' },
                { label: t.analyticsPage.oversized, color: 'bg-blue-500' },
                { label: t.analyticsPage.dopamine, color: 'bg-orange-500' },
                { label: t.analyticsPage.digital, color: 'bg-indigo-500' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {getSelectedTimeLabel()}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>{t.analyticsPage.demographicAnalysis}</CardTitle>
            <CardDescription>
              {t.analyticsPage.demographicAnalysisDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">{t.analyticsPage.ageGroups}</h3>
                <div className="space-y-2">
                  {[
                    { group: "16-24", percentage: 35 },
                    { group: "25-34", percentage: 42 },
                    { group: "35-44", percentage: 15 },
                    { group: "45+", percentage: 8 },
                  ].map((item) => (
                    <div key={item.group} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{item.group}</span>
                        <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>{t.analyticsPage.geographicDistribution}</CardTitle>
            <CardDescription>
              {t.analyticsPage.geographicDistributionDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { region: t.analyticsPage.northAmerica, percentage: 38 },
                { region: t.analyticsPage.europe, percentage: 32 },
                { region: t.analyticsPage.asia, percentage: 22 },
                { region: t.analyticsPage.otherRegions, percentage: 8 },
              ].map((item) => (
                <div key={item.region} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{item.region}</span>
                    <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle>{t.analyticsPage.sentimentAnalysis}</CardTitle>
            <CardDescription>
              {t.analyticsPage.sentimentAnalysisDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { sentiment: t.analyticsPage.veryPositive, percentage: 42, color: "bg-green-600" },
                { sentiment: t.analyticsPage.positive, percentage: 35, color: "bg-green-500" },
                { sentiment: t.analyticsPage.neutral, percentage: 15, color: "bg-gray-500" },
                { sentiment: t.analyticsPage.negative, percentage: 8, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.sentiment} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{item.sentiment}</span>
                    <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
