'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Link as LinkIcon, ArrowRight, Check, X, Loader2, Sparkles, ImageIcon, FolderOpen, LogOut, AlertCircle, RefreshCw, Download, ChevronLeft, Pencil, Search, TrendingUp, Send, Lock, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { saveCreativeSpaceData, type CreativeSpaceData } from '@/lib/data-sync';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

// Professional Pantone TCX Fashion Color Mapping
// Based on Pantone Fashion, Home + Interiors Color System
function getColorValue(colorName: string): string | null {
  const colorMap: Record<string, string> = {
    // === WHITES & OFF-WHITES (Pantone TCX) ===
    'white': '#FFFFFF', 'bright white': '#F4F5F0', 'snow white': '#F2F0EB',
    'cloud dancer': '#F0EEE4', 'whisper white': '#EDE6DB', 'marshmallow': '#F0E6D8',
    'gardenia': '#F1E8DA', 'pristine': '#E8DFD0', 'antique white': '#E8DCC8',
    'winter white': '#E4DACD', 'cream': '#F5E6C8', 'ivory': '#F2E8D5',
    'off-white': '#FAF6F0', 'off white': '#FAF6F0', 'egret': '#F3EEE4',
    'blanc de blanc': '#E8E4DA', 'vanilla ice': '#F0E4D4', 'papyrus': '#EDE4D0',
    
    // === BEIGES & NEUTRALS (Pantone TCX) ===
    'beige': '#C8B88A', 'warm beige': '#C4A77D', 'sand': '#C2B280',
    'sandstone': '#786D5F', 'pebble': '#B5A999', 'stone': '#928E85',
    'taupe': '#8B7355', 'warm taupe': '#9F8170', 'silver mink': '#9E9085',
    'fungi': '#8F8681', 'dune': '#CFC1A7', 'safari': '#B5A084',
    'nomad': '#B4A68E', 'pale khaki': '#C3B091', 'twill': '#B8A88A',
    'sesame': '#D2B48C', 'tan': '#C19A6B', 'camel': '#C19A6B',
    'caramel': '#A67B5B', 'toffee': '#755139', 'tobacco brown': '#6F4E37',
    
    // === BROWNS (Pantone TCX) ===
    'brown': '#6B4423', 'chocolate': '#3D1C02', 'chocolate brown': '#3D1C02',
    'espresso': '#3C2415', 'coffee': '#6F4E37', 'mocha': '#967969',
    'cognac': '#9A463D', 'chestnut': '#954535', 'mahogany': '#4C2C17',
    'walnut': '#5D432C', 'cinnamon': '#D27D46', 'ginger': '#B06500',
    'rust': '#B7410E', 'burnt orange': '#CC5500', 'terracotta': '#C04000',
    'sienna': '#A0522D', 'burnt sienna': '#E97451', 'copper': '#B87333',
    'bronze': '#CD7F32', 'amber': '#FFBF00', 'honey': '#EB9605',
    'butterscotch': '#E09540', 'ochre': '#CC7722', 'mustard': '#FFDB58',
    'golden brown': '#996515', 'buckhorn brown': '#8B6914',
    
    // === REDS (Pantone TCX) ===
    'red': '#BE0032', 'true red': '#BF1932', 'fiery red': '#D01C1F',
    'scarlet': '#FF2400', 'cherry': '#DE3163', 'crimson': '#DC143C',
    'ruby': '#9B111E', 'garnet': '#733635', 'blood red': '#660000',
    'cardinal': '#C41E3A', 'poppy red': '#E35335', 'flame': '#E25822',
    'tomato': '#FF6347', 'vermillion': '#E34234', 'cinnabar': '#E44D2E',
    'coral': '#FF7F50', 'salmon': '#FA8072', 'peach': '#FFCBA4',
    'apricot': '#FBCEB1', 'melon': '#FEBAAD', 'cantaloupe': '#FFA62F',
    
    // === PINKS (Pantone TCX) ===
    'pink': '#FFC0CB', 'hot pink': '#FF69B4', 'fuchsia': '#FF00FF',
    'magenta': '#FF0090', 'cerise': '#DE3163', 'raspberry': '#E30B5C',
    'rose': '#FF007F', 'dusty rose': '#DCAE96', 'dusty pink': '#D4A5A5',
    'blush': '#DE5D83', 'blush pink': '#FEC5E5', 'powder pink': '#FFB6C1',
    'ballet slipper': '#F5D7DC', 'peony': '#DE6FA1', 'orchid pink': '#F2BDCD',
    'mauve': '#E0B0FF', 'lilac': '#C8A2C8', 'lavender pink': '#FBAED2',
    'bubblegum': '#FFC1CC', 'candy pink': '#E4717A', 'flamingo': '#FC8EAC',
    
    // === ORANGES (Pantone TCX) ===
    'orange': '#FF6600', 'tangerine': '#FF9966', 'mandarin': '#F37A48',
    'persimmon': '#EC5800', 'pumpkin': '#FF7518', 'carrot': '#ED9121',
    'papaya': '#FFEFD5', 'mango': '#FF8243', 'sunset orange': '#FD5E53',
    'rust orange': '#C45D3B', 'spice': '#6A442E',
    'cayenne': '#8D0226', 'paprika': '#8B2500', 'cinnamon stick': '#9C4722',
    
    // === YELLOWS (Pantone TCX) ===
    'yellow': '#FFD700', 'bright yellow': '#FFFF00', 'lemon': '#FFF44F',
    'canary': '#FFEF00', 'sunshine': '#FFFD37', 'daffodil': '#FFFF31',
    'buttercup': '#F9E814', 'marigold': '#EAA221', 'gold': '#FFD700',
    'golden yellow': '#FFDF00', 'saffron': '#F4C430', 'turmeric': '#FFD54F',
    'curry': '#CABB48', 'chartreuse': '#DFFF00', 'lime': '#BFFF00',
    'sulfur': '#E8E050', 'primrose yellow': '#F6EB61', 'illuminating': '#F5DF4D',
    
    // === GREENS (Pantone TCX) ===
    'green': '#008000', 'kelly green': '#4CBB17', 'grass green': '#7CFC00',
    'lime green': '#32CD32', 'apple green': '#8DB600', 'leaf green': '#71AA34',
    'forest green': '#228B22', 'hunter green': '#355E3B', 'pine green': '#01796F',
    'evergreen': '#05472A', 'bottle green': '#006A4E', 'racing green': '#004225',
    'emerald': '#50C878', 'jade': '#00A86B', 'malachite': '#0BDA51',
    'mint': '#98FF98', 'mint green': '#98FF98', 'seafoam': '#93E9BE',
    'sage': '#9DC183', 'sage green': '#9DC183', 'olive': '#808000',
    'olive green': '#6B8E23', 'army green': '#4B5320', 'khaki': '#C3B091',
    'moss': '#8A9A5B', 'fern': '#4F7942', 'basil': '#5D8A66',
    'pistachio': '#93C572', 'celadon': '#ACE1AF', 'eucalyptus': '#44D7A8',
    'teal': '#008080', 'dark teal': '#014D4E', 'deep teal': '#003E3E',
    
    // === BLUES (Pantone TCX) ===
    'blue': '#0000FF', 'true blue': '#0073CF', 'classic blue': '#0F4C81',
    'navy': '#000080', 'navy blue': '#403F6F', 'dark navy': '#1B1B3A',
    'midnight blue': '#191970', 'prussian blue': '#003153', 'marine': '#042E60',
    'cobalt': '#0047AB', 'cobalt blue': '#0047AB', 'royal blue': '#4169E1',
    'sapphire': '#0F52BA', 'azure': '#007FFF', 'cerulean': '#007BA7',
    'electric blue': '#0892D0', 'bright blue': '#0096FF', 'vivid blue': '#00BFFF',
    'sky blue': '#87CEEB', 'light blue': '#ADD8E6', 'baby blue': '#89CFF0',
    'powder blue': '#B0E0E6', 'ice blue': '#99FFFF', 'arctic blue': '#82EDFD',
    'steel blue': '#4682B4', 'slate blue': '#6A5ACD', 'denim': '#1560BD',
    'indigo': '#4B0082', 'ink blue': '#1A1B41', 'peacock blue': '#005F69',
    'petrol': '#005F6A', 'petroleum': '#253529', 'aegean': '#1F456E',
    'cornflower': '#6495ED', 'periwinkle': '#CCCCFF', 'hydrangea': '#7B68EE',
    'french blue': '#0072BB', 'delft blue': '#1F305E', 'dutch blue': '#1E3F66',
    'turquoise': '#40E0D0', 'aqua': '#00FFFF', 'cyan': '#00FFFF',
    'aquamarine': '#7FFFD4', 'caribbean': '#00CED1', 'lagoon': '#017987',
    
    // === PURPLES & VIOLETS (Pantone TCX) ===
    'purple': '#800080', 'violet': '#8B00FF', 'grape': '#6F2DA8',
    'plum': '#8E4585', 'eggplant': '#614051', 'aubergine': '#3D0734',
    'amethyst': '#9966CC', 'orchid': '#DA70D6', 'wisteria': '#C9A0DC',
    'lavender': '#E6E6FA', 'heather': '#B7A9C4', 'thistle': '#D8BFD8',
    'iris': '#5A4FCF', 'hyacinth': '#7B68EE', 'crocus': '#BE93D4',
    'mulberry': '#C54B8C', 'boysenberry': '#873260', 'blackberry': '#4D0135',
    'wine': '#722F37', 'burgundy': '#800020', 'bordeaux': '#5C1F31',
    'maroon': '#800000', 'oxblood': '#4A0000', 'claret': '#7F1734',
    'merlot': '#730039', 'cabernet': '#4C0013', 'sangria': '#92000A',
    
    // === GRAYS (Pantone TCX) ===
    'gray': '#808080', 'grey': '#808080', 'charcoal': '#36454F',
    'anthracite': '#293133', 'graphite': '#383838', 'slate': '#708090',
    'slate gray': '#708090', 'steel gray': '#71797E', 'gunmetal': '#2C3539',
    'ash': '#B2BEB5', 'silver': '#C0C0C0', 'platinum': '#E5E4E2',
    'pearl gray': '#C4C3C0', 'dove gray': '#6D6968', 'storm gray': '#717C89',
    'cement': '#8D8D8D', 'concrete': '#95A5A6', 'titanium': '#878681',
    'pewter': '#8E8E8E', 'nickel': '#727472', 'iron': '#48494B',
    'smoke': '#738276', 'fog': '#D7D0C0', 'mist': '#C4C4BC',
    
    // === BLACKS (Pantone TCX) ===
    'black': '#000000', 'jet black': '#0A0A0A', 'onyx': '#0F0F0F',
    'obsidian': '#0B0B0B', 'raven': '#0D0D0D', 'ebony': '#555D50',
    'ink': '#1A1A1A', 'midnight': '#191970', 'caviar': '#292929',
  };
  
  const normalized = colorName.toLowerCase().trim();
  
  // Direct match
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }
  
  // Fuzzy match - try to find partial matches
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

// Determine if text should be light or dark based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

interface MoodImage {
  id: string;
  src: string;
  name: string;
  source?: 'upload' | 'pinterest';
}

interface PinterestPin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dominantColor?: string;
}

interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
}

interface MoodboardAnalysis {
  collectionName?: string;
  keyColors: string[];
  keyTrends: string[];
  keyBrands?: string[];
  keyItems: string[];
  keyStyles?: string[];
  keyMaterials?: string[];
  seasonalFit?: string;
  moodDescription?: string;
  targetAudience?: string;
}

interface MarketTrends {
  keyColors: string[];
  keyTrends: string[];
  keyItems: string[];
  lastUpdated?: string;
}

interface TrendExploration {
  query: string;
  keyColors: string[];
  keyTrends: string[];
  keyItems: string[];
  description: string;
}

interface SelectedTrends {
  colors: string[];
  trends: string[];
  items: string[];
}

interface NeighborhoodGarment {
  name: string;
  mentions: number;
  isNew: boolean;
  rank: number;
}

interface NeighborhoodStyle {
  name: string;
  mentions: number;
  isNew: boolean;
}

interface NeighborhoodBrand {
  name: string;
  mentions: number;
  type: string;
}

interface NeighborhoodSpot {
  name: string;
  mentions: number;
}

interface MicroTrend {
  name: string;
  description: string;
  confidence: number;
}

interface NeighborhoodData {
  city: string;
  neighborhood: string;
  garments: NeighborhoodGarment[];
  styles: NeighborhoodStyle[];
  brands: NeighborhoodBrand[];
  localSpots: NeighborhoodSpot[];
  microTrends: MicroTrend[];
}

interface TikTokHashtagTrend {
  hashtag: string;
  total_plays: number;
  total_likes: number;
  post_count: number;
  neighborhood?: string;
  top_related_hashtags?: string[];
}

interface CityTrendsResponse {
  neighborhoods: NeighborhoodData[];
  tiktokTrends: TikTokHashtagTrend[];
  period: string;
  hasProcessedData: boolean;
}

interface Signal {
  id: string;
  signal_name: string;
  signal_type?: string;
  composite_score?: number;
  acceleration_factor?: number;
  platforms_present?: number;
  reddit_mentions?: number;
  pinterest_pin_count?: number;
  youtube_total_views?: number;
  location?: string;
}

interface CreativeSpaceClientProps {
  signals?: Signal[];
}

export function CreativeSpaceClient({ signals = [] }: CreativeSpaceClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [images, setImages] = useState<MoodImage[]>([]);
  const [pinterestConnected, setPinterestConnected] = useState(false);
  const [pinterestBoards, setPinterestBoards] = useState<PinterestBoard[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<MoodboardAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pinterestError, setPinterestError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);
  const [boardPins, setBoardPins] = useState<PinterestPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  
  // AI Trend Insights state
  const [marketTrends, setMarketTrends] = useState<MarketTrends | null>(null);
  const [loadingMarketTrends, setLoadingMarketTrends] = useState(false);
  const [trendQuery, setTrendQuery] = useState('');
  const [trendExploration, setTrendExploration] = useState<TrendExploration | null>(null);
  const [exploringTrend, setExploringTrend] = useState(false);
  const [selectedTrends, setSelectedTrends] = useState<SelectedTrends>({
    colors: [],
    trends: [],
    items: []
  });
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  
  // City Trends state (Instagram + TikTok from Apify)
  const [cityTrends, setCityTrends] = useState<CityTrendsResponse | null>(null);
  const [loadingCityTrends, setLoadingCityTrends] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('London');
  const [selectedCityTrends, setSelectedCityTrends] = useState<string[]>([]);

  // Computed values from signals
  const totalSignals = signals.length;
  const totalRedditMentions = signals.reduce((sum, s) => sum + (s.reddit_mentions || 0), 0);
  const totalPinterestPins = signals.reduce((sum, s) => sum + (s.pinterest_pin_count || 0), 0);
  const totalYoutubeViews = signals.reduce((sum, s) => sum + (s.youtube_total_views || 0), 0);
  const avgAcceleration = signals.length > 0
    ? signals.reduce((sum, s) => sum + (s.acceleration_factor || 1), 0) / signals.length
    : 1;
  const growthPercent = Math.round((avgAcceleration - 1) * 100);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Pinterest is connected
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pinterest_connected') === 'true') {
      setPinterestConnected(true);
      loadPinterestBoards();
      // Clean up URL
      window.history.replaceState({}, '', '/creative-space');
    }

    // Check if Pinterest was disconnected
    if (urlParams.get('pinterest_disconnected') === 'true') {
      // Clean up URL
      window.history.replaceState({}, '', '/creative-space');
    }

    // Check stored Pinterest state
    const storedPinterestState = localStorage.getItem('olawave_pinterest_connected');
    if (storedPinterestState === 'true') {
      setPinterestConnected(true);
      const storedBoards = localStorage.getItem('olawave_pinterest_boards');
      if (storedBoards) {
        setPinterestBoards(JSON.parse(storedBoards));
      }
      const storedSelected = localStorage.getItem('olawave_pinterest_selected');
      if (storedSelected) {
        setSelectedBoards(JSON.parse(storedSelected));
      }
    }
  }, []);

  // Save data whenever images, selected boards, or AI analysis change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Old format for backward compat
      const summary = {
        count: images.length,
        names: images.map((img) => img.name).slice(0, 20),
      };
      window.localStorage.setItem('olawave_moodboard_summary', JSON.stringify(summary));

      // New unified format - use AI analysis if available
      const selectedBoardsData = pinterestBoards.filter(b => selectedBoards.includes(b.id));
      const creativeData: CreativeSpaceData = {
        moodboardImages: images.map(img => ({
          id: img.id,
          name: img.name,
          url: img.src
        })),
        pinterestBoards: selectedBoardsData.map(b => ({
          id: b.id,
          name: b.name,
          pinCount: b.pin_count
        })),
        keyColors: aiAnalysis?.keyColors || [],
        keyTrends: aiAnalysis?.keyTrends || [],
        keyItems: aiAnalysis?.keyItems || [],
        keyStyles: aiAnalysis?.keyStyles || [],
      };
      saveCreativeSpaceData(creativeData);
      
      // Store Pinterest selected boards
      if (selectedBoards.length > 0) {
        localStorage.setItem('olawave_pinterest_selected', JSON.stringify(selectedBoards));
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [images, selectedBoards, pinterestBoards, aiAnalysis]);

  // Convert image URL to base64
  const imageToBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string } | null> => {
    try {
      // For blob URLs (uploaded files) - can fetch directly
      if (imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ base64, mimeType: blob.type || 'image/jpeg' });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
      
      // For external URLs (Pinterest, etc.) - use server proxy to avoid CORS
      if (imageUrl.startsWith('http')) {
        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
        
        if (response.ok) {
          const data = await response.json();
          return { base64: data.base64, mimeType: data.mimeType };
        }
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };

  // Analyze moodboard with AI - sends actual images to Gemini Vision
  const analyzeMoodboard = async () => {
    if (images.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Convert all images to base64 for Gemini Vision
      console.log(`Converting ${images.length} images to base64...`);
      const imagePromises = images.map(img => imageToBase64(img.src));
      const base64Images = await Promise.all(imagePromises);
      
      // Filter out failed conversions
      const validImages = base64Images.filter((img): img is { base64: string; mimeType: string } => img !== null);
      
      if (validImages.length === 0) {
        console.error('No images could be converted');
        return;
      }
      
      console.log(`Sending ${validImages.length} images to Gemini Vision...`);
      
      const response = await fetch('/api/ai/analyze-moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: validImages,
        }),
      });

      const data = await response.json();
      console.log('API Response status:', response.status);
      console.log('API Response data:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        // Check if we got valid analysis data
        if (data && (data.keyColors || data.keyTrends || data.keyItems)) {
          console.log('Setting AI Analysis:', data);
          setAiAnalysis(data);
        } else if (data.error) {
          console.error('API returned error:', data.error);
          alert(`Error: ${data.error}`);
        } else {
          console.error('Invalid analysis data received:', data);
        }
      } else {
        console.error('Analysis failed:', data);
        alert(`Analysis failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error analyzing moodboard:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadPinterestBoards = async () => {
    setLoadingBoards(true);
    setPinterestError(null);
    try {
      const res = await fetch('/api/pinterest/boards');
      const data = await res.json();
      
      if (!res.ok) {
        // Handle specific error codes
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'NO_TOKEN') {
          setPinterestError('Tu sesión de Pinterest ha expirado. Por favor, reconecta tu cuenta.');
          // Auto-disconnect on token expiry
          handlePinterestDisconnect();
          return;
        }
        setPinterestError(data.error || 'Error al cargar los boards de Pinterest');
        return;
      }
      
      if (data.items && Array.isArray(data.items)) {
        setPinterestBoards(data.items);
        localStorage.setItem('olawave_pinterest_boards', JSON.stringify(data.items));
        localStorage.setItem('olawave_pinterest_connected', 'true');
        setShowBoardSelector(true);
        setPinterestError(null);
      } else {
        setPinterestError('No se encontraron boards en tu cuenta de Pinterest');
      }
    } catch (err) {
      console.error('Error loading boards:', err);
      setPinterestError('Error de conexión. Por favor, inténtalo de nuevo.');
    } finally {
      setLoadingBoards(false);
    }
  };

  const handlePinterestDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch('/api/auth/pinterest/signout', { method: 'POST' });
      
      // Clear local state
      setPinterestConnected(false);
      setPinterestBoards([]);
      setSelectedBoards([]);
      setPinterestError(null);
      setViewingBoardId(null);
      setBoardPins([]);
      
      // Clear localStorage
      localStorage.removeItem('olawave_pinterest_connected');
      localStorage.removeItem('olawave_pinterest_boards');
      localStorage.removeItem('olawave_pinterest_selected');
    } catch (err) {
      console.error('Error disconnecting Pinterest:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const loadBoardPins = async (boardId: string) => {
    setLoadingPins(true);
    setViewingBoardId(boardId);
    setSelectedPins(new Set());
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      
      if (res.ok && data.items) {
        setBoardPins(data.items);
      } else {
        setPinterestError('Error al cargar los pins del board');
      }
    } catch (err) {
      console.error('Error loading pins:', err);
      setPinterestError('Error de conexión al cargar pins');
    } finally {
      setLoadingPins(false);
    }
  };

  const togglePinSelection = (pinId: string) => {
    setSelectedPins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pinId)) {
        newSet.delete(pinId);
      } else {
        newSet.add(pinId);
      }
      return newSet;
    });
  };

  const selectAllPins = () => {
    if (selectedPins.size === boardPins.length) {
      setSelectedPins(new Set());
    } else {
      setSelectedPins(new Set(boardPins.map(p => p.id)));
    }
  };

  const importSelectedPins = () => {
    const pinsToImport = boardPins.filter(pin => selectedPins.has(pin.id));
    const newImages: MoodImage[] = pinsToImport.map(pin => ({
      id: `pinterest-${pin.id}`,
      src: pin.imageUrl,
      name: pin.title || 'Pinterest Pin',
      source: 'pinterest' as const,
    }));
    
    // Add to moodboard, avoiding duplicates
    setImages(prev => {
      const existingIds = new Set(prev.map(img => img.id));
      const uniqueNew = newImages.filter(img => !existingIds.has(img.id));
      return [...prev, ...uniqueNew];
    });
    
    // Go back to board list
    setViewingBoardId(null);
    setBoardPins([]);
    setSelectedPins(new Set());
  };

  const importAllBoardPins = async (boardId: string) => {
    setLoadingPins(true);
    try {
      const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
      const data = await res.json();
      
      if (res.ok && data.items) {
        const newImages: MoodImage[] = data.items.map((pin: PinterestPin) => ({
          id: `pinterest-${pin.id}`,
          src: pin.imageUrl,
          name: pin.title || 'Pinterest Pin',
          source: 'pinterest' as const,
        }));
        
        setImages(prev => {
          const existingIds = new Set(prev.map(img => img.id));
          const uniqueNew = newImages.filter(img => !existingIds.has(img.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (err) {
      console.error('Error importing board:', err);
    } finally {
      setLoadingPins(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newImages: MoodImage[] = [];

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        src: url,
        name: file.name,
      });
    });

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handlePinterestConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI || 'https://olawave.ai/api/auth/pinterest/callback';
    const scope = 'boards:read,pins:read';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
    
    window.location.href = authUrl;
  };

  const toggleBoardSelection = (boardId: string) => {
    setSelectedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const hasContent = images.length > 0 || selectedBoards.length > 0;

  const handleContinue = () => {
    router.push('/my-collections');
  };

  // Load market trends
  const loadMarketTrends = async () => {
    setLoadingMarketTrends(true);
    try {
      const response = await fetch('/api/ai/market-trends');
      if (response.ok) {
        const data = await response.json();
        setMarketTrends(data);
      }
    } catch (error) {
      console.error('Error loading market trends:', error);
    } finally {
      setLoadingMarketTrends(false);
    }
  };

  // Explore a specific trend
  const exploreTrend = async () => {
    if (!trendQuery.trim()) return;
    
    setExploringTrend(true);
    try {
      const response = await fetch('/api/ai/explore-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trendQuery }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrendExploration(data);
      }
    } catch (error) {
      console.error('Error exploring trend:', error);
    } finally {
      setExploringTrend(false);
    }
  };

  // Toggle selection of a trend item
  const toggleTrendSelection = (type: 'colors' | 'trends' | 'items', value: string) => {
    setSelectedTrends(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  // Add all items from exploration to selection
  const addExplorationToSelection = () => {
    if (!trendExploration) return;
    setSelectedTrends(prev => ({
      colors: Array.from(new Set([...prev.colors, ...trendExploration.keyColors])),
      trends: Array.from(new Set([...prev.trends, ...trendExploration.keyTrends])),
      items: Array.from(new Set([...prev.items, ...trendExploration.keyItems]))
    }));
  };

  // Toggle signal selection
  const toggleSignalSelection = (signalName: string) => {
    setSelectedSignals(prev => 
      prev.includes(signalName)
        ? prev.filter(s => s !== signalName)
        : [...prev, signalName]
    );
  };

  // Load City Trends data (from Apify scraping)
  const loadCityTrends = async () => {
    setLoadingCityTrends(true);
    try {
      const response = await fetch('/api/city-trends');
      if (response.ok) {
        const data = await response.json();
        setCityTrends(data);
        // Set first neighborhood as selected if available
        if (data.neighborhoods && data.neighborhoods.length > 0) {
          const currentNeighborhood = data.neighborhoods.find((n: NeighborhoodData) => n.neighborhood === selectedCity);
          if (!currentNeighborhood) {
            setSelectedCity(data.neighborhoods[0].neighborhood);
          }
        }
      }
    } catch (error) {
      console.error('Error loading city trends:', error);
    } finally {
      setLoadingCityTrends(false);
    }
  };

  // Toggle city trend selection
  const toggleCityTrendSelection = (trendName: string) => {
    setSelectedCityTrends(prev => 
      prev.includes(trendName)
        ? prev.filter(t => t !== trendName)
        : [...prev, trendName]
    );
  };

  // Get current neighborhood data
  const currentNeighborhoodData = cityTrends?.neighborhoods?.find((n: NeighborhoodData) => n.neighborhood === selectedCity);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show sign-in required screen if not authenticated
  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-3">Sign in to Create</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Create an account or sign in to start building your collection with AI-powered trend insights and moodboard analysis.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowAuthModal(true)}
            className="rounded-full px-8"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Sign In to Get Started
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Free to use · No credit card required
          </p>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
            1
          </div>
          <div>
            <h3 className="font-semibold">Step 1: Inspiration</h3>
            <p className="text-sm text-muted-foreground">Build your creative moodboard</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-pink-100 text-pink-700">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Analyzed
        </Badge>
      </div>

      {/* Main Moodboard Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Your Creative Moodboard
              </CardTitle>
              <CardDescription>
                Upload images or connect Pinterest to define your collection's visual direction
              </CardDescription>
            </div>
            {images.length > 0 && (
              <Button 
                onClick={analyzeMoodboard} 
                disabled={isAnalyzing}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Masonry Grid - Images First */}
            {images.length > 0 && (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative group overflow-hidden rounded-lg border bg-background break-inside-avoid"
                  >
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
                      style={{ 
                        // Vary heights for masonry effect
                        minHeight: index % 3 === 0 ? '200px' : index % 3 === 1 ? '150px' : '180px'
                      }}
                    />
                    <button
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      onClick={() => removeImage(img.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {img.source === 'pinterest' && (
                      <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Pinterest
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Compact Upload Area - Below Images */}
            <label className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all ${images.length > 0 ? 'p-4' : 'p-8'}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className={`rounded-full bg-primary/10 flex items-center justify-center ${images.length > 0 ? 'w-8 h-8' : 'w-12 h-12'}`}>
                <Plus className={`text-primary ${images.length > 0 ? 'h-4 w-4' : 'h-6 w-6'}`} />
              </div>
              <div className="text-center">
                <p className={`font-medium ${images.length > 0 ? 'text-sm' : ''}`}>
                  {images.length > 0 ? 'Add more images' : 'Drop images here or click to upload'}
                </p>
                {images.length === 0 && (
                  <p className="text-sm text-muted-foreground">Supports JPG, PNG, GIF up to 10MB each</p>
                )}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  <Input
                    value={aiAnalysis.collectionName || ''}
                    onChange={(e) => setAiAnalysis({ ...aiAnalysis, collectionName: e.target.value })}
                    placeholder="Collection Name"
                    className="text-xl font-semibold text-purple-900 bg-transparent border-none hover:bg-white/50 focus:bg-white/80 px-2 py-1 h-auto transition-colors"
                  />
                  <Pencil className="h-4 w-4 text-purple-400 flex-shrink-0" />
                </div>
                <CardDescription className="mt-1">
                  {aiAnalysis.moodDescription || 'Insights extracted from your creative direction'}
                </CardDescription>
              </div>
              {aiAnalysis.seasonalFit && (
                <Badge className="bg-purple-600 text-white text-sm px-3 py-1 flex-shrink-0">
                  {aiAnalysis.seasonalFit}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Colors */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Key Colors</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyColors?.map((color, i) => {
                    const bgColor = getColorValue(color);
                    const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                    return (
                      <Badge key={i} variant="secondary" className="border"
                        style={bgColor ? { backgroundColor: bgColor, color: textColor, borderColor: bgColor } : { backgroundColor: 'rgba(255,255,255,0.8)' }}>
                        {color}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              {/* Trends */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Key Trends</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyTrends?.map((trend, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/80">
                      {trend}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Brands */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Reference Brands</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyBrands?.map((brand, i) => (
                    <Badge key={i} variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
                      {brand}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Key Items</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyItems?.map((item, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/80">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Materials */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Key Materials</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyMaterials?.map((material, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/80">
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Styles */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-900">Key Styles</h4>
                <div className="flex flex-wrap gap-1">
                  {aiAnalysis.keyStyles?.map((style, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/80">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {aiAnalysis.targetAudience && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold">Target Audience:</span> {aiAnalysis.targetAudience}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pinterest Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.97 2.22-2.97 1.05 0 1.56.78 1.56 1.72 0 1.05-.67 2.62-1.01 4.07-.29 1.2.61 2.18 1.8 2.18 2.16 0 3.82-2.28 3.82-5.57 0-2.91-2.09-4.95-5.08-4.95-3.46 0-5.49 2.6-5.49 5.28 0 1.05.4 2.17.91 2.78.1.12.11.23.08.35l-.34 1.38c-.05.22-.18.27-.41.16-1.52-.71-2.47-2.93-2.47-4.72 0-3.84 2.79-7.37 8.05-7.37 4.23 0 7.51 3.01 7.51 7.04 0 4.2-2.65 7.58-6.33 7.58-1.24 0-2.4-.64-2.8-1.4l-.76 2.9c-.28 1.06-1.03 2.4-1.53 3.21A12 12 0 1 0 12 0z"/>
                </svg>
                Pinterest Boards
              </CardTitle>
              <CardDescription>
                Import inspiration directly from your Pinterest boards
              </CardDescription>
            </div>
            {!pinterestConnected ? (
              <Button onClick={handlePinterestConnect}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect Pinterest
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePinterestDisconnect}
                  disabled={isDisconnecting}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Pinterest Error Message */}
          {pinterestError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{pinterestError}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadPinterestBoards}
                  className="mt-2 text-red-600 hover:text-red-700 p-0 h-auto"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {!pinterestConnected ? (
            <div className="text-center py-6 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Connect your Pinterest account to import boards as creative inspiration</p>
            </div>
          ) : loadingBoards ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading your boards...</span>
            </div>
          ) : viewingBoardId ? (
            // Viewing pins inside a board
            <div>
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setViewingBoardId(null); setBoardPins([]); setSelectedPins(new Set()); }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Volver a boards
                </Button>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAllPins}
                    disabled={loadingPins}
                  >
                    {selectedPins.size === boardPins.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                  {selectedPins.size > 0 && (
                    <Button 
                      size="sm" 
                      onClick={importSelectedPins}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Importar {selectedPins.size} pins
                    </Button>
                  )}
                </div>
              </div>
              
              {loadingPins ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Cargando pins...</span>
                </div>
              ) : boardPins.length > 0 ? (
                <div className="grid gap-3 grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {boardPins.map((pin) => (
                    <button
                      key={pin.id}
                      onClick={() => togglePinSelection(pin.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                        selectedPins.has(pin.id)
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      {selectedPins.has(pin.id) && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <img 
                        src={pin.imageUrl} 
                        alt={pin.title || 'Pin'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No se encontraron pins en este board</p>
              )}
            </div>
          ) : pinterestBoards.length > 0 ? (
            // Board list view
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Haz clic en un board para ver sus pins, o importa todo el board directamente
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadPinterestBoards}
                  disabled={loadingBoards}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingBoards ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {pinterestBoards.map((board) => (
                  <div
                    key={board.id}
                    className="relative p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
                  >
                    {board.image_thumbnail_url ? (
                      <img 
                        src={board.image_thumbnail_url} 
                        alt={board.name}
                        className="w-full h-20 object-cover rounded-md mb-2"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                        <FolderOpen className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <h4 className="font-medium text-sm truncate mb-1">{board.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{board.pin_count} pins</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => loadBoardPins(board.id)}
                      >
                        Ver pins
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => importAllBoardPins(board.id)}
                        disabled={loadingPins}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Importar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Button onClick={loadPinterestBoards} disabled={loadingBoards}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Load My Boards
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Trend Insights */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">AI Trend Insights</h2>
          <p className="text-muted-foreground">
            Discover trends from multiple sources to inform your collection direction.
          </p>
        </div>

        {/* BLOCK 1: Macro Trends - Editorial Style */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Macro Trends</h3>
                  <p className="text-sm text-muted-foreground">SS26 & Pre-Fall 2026 Runway Intelligence</p>
                </div>
              </div>
            </div>
            <Button onClick={loadMarketTrends} disabled={loadingMarketTrends} variant="outline" className="gap-2 rounded-full px-6">
              {loadingMarketTrends ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {marketTrends ? 'Refresh' : 'Load Trends'}
            </Button>
          </div>
          
          {marketTrends && (
            <div className="space-y-8">
              {/* KEY COLORS - Visual Swatches */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Colors</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {marketTrends.keyColors.map((color, i) => {
                    // Parse color: "Name (code) - description" or "Name - description"
                    let colorName = color;
                    let colorCode = '';
                    let colorDescription = '';
                    
                    // Extract description after " - "
                    if (color.includes(' - ')) {
                      const [namePart, ...descParts] = color.split(' - ');
                      colorName = namePart.trim();
                      colorDescription = descParts.join(' - ').trim();
                    }
                    
                    // Extract code from parentheses
                    const codeMatch = colorName.match(/\(([^)]+)\)/);
                    if (codeMatch) {
                      colorCode = codeMatch[1];
                      colorName = colorName.replace(/\s*\([^)]+\)/, '').trim();
                    }
                    
                    const bgColor = getColorValue(colorName);
                    const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                    const isSelected = selectedTrends.colors.includes(color);
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('colors', color)}
                        className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                      >
                        {/* Color swatch header */}
                        <div 
                          className="h-20 relative"
                          style={{ backgroundColor: bgColor || '#f5f5f5' }}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-white/30">
                              <Check className="h-3 w-3" style={{ color: textColor || '#333' }} />
                            </div>
                          )}
                          {colorCode && (
                            <div className="absolute bottom-2 left-3">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20" style={{ color: textColor || '#333' }}>
                                {colorCode}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Color info */}
                        <div className="p-3 bg-white border-t">
                          <h5 className="font-semibold text-sm text-slate-900">{colorName}</h5>
                          {colorDescription && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{colorDescription}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KEY TRENDS - Card Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Trends</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {marketTrends.keyTrends.map((trend, i) => {
                    const isSelected = selectedTrends.trends.includes(trend);
                    // Split trend into title and description - try colon first, then dash
                    let title = trend;
                    let description = '';
                    if (trend.includes(':')) {
                      const [t, ...descParts] = trend.split(':');
                      title = t.trim();
                      description = descParts.join(':').trim();
                    } else if (trend.includes(' - ')) {
                      const [t, ...descParts] = trend.split(' - ');
                      title = t.trim();
                      description = descParts.join(' - ').trim();
                    }
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('trends', trend)}
                        className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-lg border ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-3 flex-1">
                            <h5 className={`font-bold text-base leading-tight ${isSelected ? '' : 'text-slate-900'}`}>
                              {title}
                            </h5>
                            {description && (
                              <p className={`text-sm leading-relaxed ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="p-1 rounded-full bg-white/20 flex-shrink-0 mt-1">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KEY ITEMS - Card Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Items</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {marketTrends.keyItems.map((item, i) => {
                    const isSelected = selectedTrends.items.includes(item);
                    // Split item into title and description - try colon first, then dash
                    let title = item;
                    let description = '';
                    if (item.includes(':')) {
                      const [t, ...descParts] = item.split(':');
                      title = t.trim();
                      description = descParts.join(':').trim();
                    } else if (item.includes(' - ')) {
                      const [t, ...descParts] = item.split(' - ');
                      title = t.trim();
                      description = descParts.join(' - ').trim();
                    }
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('items', item)}
                        className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-md border ${
                          isSelected 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-2 flex-1">
                            <h5 className={`font-semibold text-sm ${isSelected ? '' : 'text-slate-900'}`}>
                              {title}
                            </h5>
                            {description && (
                              <p className={`text-xs leading-relaxed ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                                {description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {!marketTrends && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Load the latest runway trends from SS26 & Pre-Fall 2026</p>
            </div>
          )}
        </div>

        {/* BLOCK 2: Explore Specific Trends */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Explore Trends</h3>
                  <p className="text-sm text-muted-foreground">Deep dive into any aesthetic or trend</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="flex gap-3">
            <Input
              placeholder="e.g., Quiet Luxury, Gorpcore, Y2K, Coquette, Boho..."
              value={trendQuery}
              onChange={(e) => setTrendQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && exploreTrend()}
              className="flex-1 h-12 text-base rounded-xl border-slate-200"
            />
            <Button onClick={exploreTrend} disabled={exploringTrend || !trendQuery.trim()} className="h-12 px-6 rounded-xl">
              {exploringTrend ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5 mr-2" />Explore</>}
            </Button>
          </div>
          
          {/* Exploration Results */}
          {trendExploration && (
            <div className="space-y-8 pt-4">
              {/* Results Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">Deep Dive: {trendExploration.query}</h4>
                  <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{trendExploration.description}</p>
                </div>
                <Button variant="outline" onClick={addExplorationToSelection} className="rounded-full px-6">
                  <Plus className="h-4 w-4 mr-2" />Add All to Selection
                </Button>
              </div>

              {/* KEY COLORS - Same format as Macro Trends */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Colors</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {trendExploration.keyColors.map((color, i) => {
                    // Parse color: "Name (code) - description" or "Name - description"
                    let colorName = color;
                    let colorCode = '';
                    let colorDescription = '';
                    
                    if (color.includes(' - ')) {
                      const [namePart, ...descParts] = color.split(' - ');
                      colorName = namePart.trim();
                      colorDescription = descParts.join(' - ').trim();
                    }
                    
                    const codeMatch = colorName.match(/\(([^)]+)\)/);
                    if (codeMatch) {
                      colorCode = codeMatch[1];
                      colorName = colorName.replace(/\s*\([^)]+\)/, '').trim();
                    }
                    
                    const bgColor = getColorValue(colorName);
                    const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                    const isSelected = selectedTrends.colors.includes(color);
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('colors', color)}
                        className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                      >
                        <div 
                          className="h-20 relative"
                          style={{ backgroundColor: bgColor || '#f5f5f5' }}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-white/30">
                              <Check className="h-3 w-3" style={{ color: textColor || '#333' }} />
                            </div>
                          )}
                          {colorCode && (
                            <div className="absolute bottom-2 left-3">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20" style={{ color: textColor || '#333' }}>
                                {colorCode}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white border-t">
                          <h5 className="font-semibold text-sm text-slate-900">{colorName}</h5>
                          {colorDescription && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{colorDescription}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KEY TRENDS - Same format as Macro Trends */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Trends</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {trendExploration.keyTrends.map((trend, i) => {
                    const isSelected = selectedTrends.trends.includes(trend);
                    let title = trend;
                    let description = '';
                    if (trend.includes(':')) {
                      const [t, ...descParts] = trend.split(':');
                      title = t.trim();
                      description = descParts.join(':').trim();
                    } else if (trend.includes(' - ')) {
                      const [t, ...descParts] = trend.split(' - ');
                      title = t.trim();
                      description = descParts.join(' - ').trim();
                    }
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('trends', trend)}
                        className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-lg border ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-3 flex-1">
                            <h5 className={`font-bold text-base leading-tight ${isSelected ? '' : 'text-slate-900'}`}>
                              {title}
                            </h5>
                            {description && (
                              <p className={`text-sm leading-relaxed ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="p-1 rounded-full bg-white/20 flex-shrink-0 mt-1">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KEY ITEMS - Same format as Macro Trends */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Items</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {trendExploration.keyItems.map((item, i) => {
                    const isSelected = selectedTrends.items.includes(item);
                    let title = item;
                    let description = '';
                    if (item.includes(':')) {
                      const [t, ...descParts] = item.split(':');
                      title = t.trim();
                      description = descParts.join(':').trim();
                    } else if (item.includes(' - ')) {
                      const [t, ...descParts] = item.split(' - ');
                      title = t.trim();
                      description = descParts.join(' - ').trim();
                    }
                    return (
                      <div 
                        key={i}
                        onClick={() => toggleTrendSelection('items', item)}
                        className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-md border ${
                          isSelected 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-2 flex-1">
                            <h5 className={`font-semibold text-sm ${isSelected ? '' : 'text-slate-900'}`}>
                              {title}
                            </h5>
                            {description && (
                              <p className={`text-xs leading-relaxed ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                                {description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Your Selection */}
        {(selectedTrends.colors.length > 0 || selectedTrends.trends.length > 0 || selectedTrends.items.length > 0) && (
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Check className="h-4 w-4 text-primary" />
              Your Trend Selection
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              {selectedTrends.colors.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Colors ({selectedTrends.colors.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.colors.map((color, i) => {
                      const bgColor = getColorValue(color);
                      const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                      return (
                        <Badge key={i} className="border" style={bgColor ? { backgroundColor: bgColor, color: textColor, borderColor: bgColor } : { backgroundColor: 'hsl(var(--primary))' }}>
                          {color}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('colors', color)} />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedTrends.trends.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Trends ({selectedTrends.trends.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.trends.map((trend, i) => (
                      <Badge key={i} className="bg-primary">{trend}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('trends', trend)} /></Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedTrends.items.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-primary">Selected Items ({selectedTrends.items.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrends.items.map((item, i) => (
                      <Badge key={i} className="bg-primary">{item}<X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleTrendSelection('items', item)} /></Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOCK 3: Live Signals from Key Neighborhoods */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Live Signals</h3>
                  <p className="text-sm text-muted-foreground">Real-time trends from Shoreditch · Reddit, YouTube & Pinterest</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Colors - Same format as Macro Trends */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Colors</h4>
              <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Warm Beige', description: 'Earthy neutral dominating street style in East London' },
                { name: 'Olive Green', description: 'Military-inspired tones trending on TikTok' },
                { name: 'Electric Blue', description: 'Bold accent color seen in Shoreditch creative scene' },
                { name: 'Camel', description: 'Classic neutral gaining momentum for layering pieces' }
              ].map((colorData, i) => {
                const bgColor = getColorValue(colorData.name);
                const textColor = bgColor ? getContrastColor(bgColor) : undefined;
                const isSelected = selectedTrends.colors.includes(colorData.name);
                return (
                  <div 
                    key={i}
                    onClick={() => toggleTrendSelection('colors', colorData.name)}
                    className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                  >
                    <div 
                      className="h-20 relative"
                      style={{ backgroundColor: bgColor || '#f5f5f5' }}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-white/30">
                          <Check className="h-3 w-3" style={{ color: textColor || '#333' }} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white border-t">
                      <h5 className="font-semibold text-sm text-slate-900">{colorData.name}</h5>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{colorData.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Trends - Same format as Macro Trends */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Trends</h4>
              <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Oversized Tailoring', description: 'Relaxed blazers and wide-leg trousers dominating Reddit fashion discussions' },
                { title: 'Gorpcore Evolution', description: 'Technical outdoor wear meets urban style, trending across YouTube fashion channels' },
                { title: 'Y2K Revival', description: 'Low-rise, butterfly clips, and metallic fabrics resurging on Pinterest boards' }
              ].map((trendData, i) => {
                const isSelected = selectedTrends.trends.includes(trendData.title);
                return (
                  <div 
                    key={i}
                    onClick={() => toggleTrendSelection('trends', trendData.title)}
                    className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-lg border ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3 flex-1">
                        <h5 className={`font-bold text-base leading-tight ${isSelected ? '' : 'text-slate-900'}`}>
                          {trendData.title}
                        </h5>
                        <p className={`text-sm leading-relaxed ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {trendData.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-white/20 flex-shrink-0 mt-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Items - Same format as Macro Trends */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Key Items</h4>
              <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Utility Vests', description: 'Functional layering piece trending in street style' },
                { title: 'Cargo Pants', description: 'Relaxed fit with multiple pockets, Reddit favorite' },
                { title: 'Bomber Jackets', description: 'Classic silhouette with modern updates' },
                { title: 'Platform Sandals', description: 'Chunky soles dominating Pinterest searches' }
              ].map((itemData, i) => {
                const isSelected = selectedTrends.items.includes(itemData.title);
                return (
                  <div 
                    key={i}
                    onClick={() => toggleTrendSelection('items', itemData.title)}
                    className={`group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:shadow-md border ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <h5 className={`font-semibold text-sm ${isSelected ? '' : 'text-slate-900'}`}>
                          {itemData.title}
                        </h5>
                        <p className={`text-xs leading-relaxed ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {itemData.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        
          {/* Overview Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
            <div className="p-5 md:p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
                <h3 className="font-semibold">Signals</h3>
              </div>
              <div className="text-2xl font-bold mt-1">{totalSignals}</div>
              <p className="text-xs text-muted-foreground">Active emerging signals (last 30 days)</p>
              <div className="absolute bottom-0 right-0 h-16 w-16 -mb-6 -mr-6 rounded-full bg-primary/20 transition-all duration-300 group-hover:scale-150"></div>
            </div>
          </div>
          
          <div className="glass-card relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
            <div className="p-5 md:p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <h3 className="font-semibold">Reddit</h3>
              </div>
              <div className="text-2xl font-bold mt-1">{totalRedditMentions}</div>
              <p className="text-xs text-muted-foreground">Mentions linked to fashion signals</p>
              <div className="absolute bottom-0 right-0 h-16 w-16 -mb-6 -mr-6 rounded-full bg-secondary/20 transition-all duration-300 group-hover:scale-150"></div>
            </div>
          </div>
          
          <div className="glass-card relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
            <div className="p-5 md:p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                <h3 className="font-semibold">Pinterest</h3>
              </div>
              <div className="text-2xl font-bold mt-1">{totalPinterestPins}</div>
              <p className="text-xs text-muted-foreground">Pins tied to emerging signals</p>
              <div className="absolute bottom-0 right-0 h-16 w-16 -mb-6 -mr-6 rounded-full bg-accent/20 transition-all duration-300 group-hover:scale-150"></div>
            </div>
          </div>
          
          <div className="glass-card relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
            <div className="p-5 md:p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><path d="m16 8-4 4-4-4"/><path d="m16 16-4-4-4 4"/></svg>
                <h3 className="font-semibold">Momentum</h3>
              </div>
              <div className="text-2xl font-bold mt-1">{growthPercent > 0 ? `+${growthPercent}%` : 'Stable'}</div>
              <p className="text-xs text-muted-foreground">Average trend acceleration</p>
              <div className="absolute bottom-0 right-0 h-16 w-16 -mb-6 -mr-6 rounded-full bg-primary/20 transition-all duration-300 group-hover:scale-150"></div>
            </div>
          </div>
        </div>

        {/* Trending Categories - Selectable */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {signals.length > 0 ? signals.map((signal) => {
            const isSelected = selectedSignals.includes(signal.signal_name);
            const accel = typeof signal.acceleration_factor === 'number'
              ? Math.round((signal.acceleration_factor - 1) * 100) : null;
            const platformsLabel = signal.platforms_present === 3 ? 'Reddit, YouTube, Pinterest'
              : signal.platforms_present === 2 ? 'Multi-platform' : 'Single platform';

            return (
              <div
                key={signal.id}
                onClick={() => toggleSignalSelection(signal.signal_name)}
                className={`rounded-lg border bg-card text-card-foreground shadow-sm p-5 md:p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                <div className="absolute top-0 right-0 w-full h-1 olawave-gradient"></div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                      <h3 className="font-semibold">{signal.signal_name}</h3>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                      {accel !== null ? `+${accel}%` : 'Signal'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {signal.signal_type
                      ? `${signal.signal_type} signal with composite score ${Math.round(signal.composite_score || 0)}`
                      : `Composite score ${Math.round(signal.composite_score || 0)} across platforms.`}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Top platforms:</span>
                    <span className="text-muted-foreground">{platformsLabel}</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No live signals available yet. Data will appear once ingested from social platforms.
            </div>
          )}
        </div>

          {/* Selected Signals */}
          {selectedSignals.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-primary" />
                Selected Signals ({selectedSignals.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedSignals.map((signal, i) => (
                  <Badge key={i} className="bg-primary">
                    {signal}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSignalSelection(signal); }} />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BLOCK 4: Neighborhood Trends - Real data from fashion neighborhoods */}
        <div className="rounded-2xl border-0 bg-gradient-to-br from-slate-50 to-white p-8 space-y-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10">
                  <MapPin className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Street Intelligence</h3>
                  <p className="text-sm text-muted-foreground">Real-time trends from fashion neighborhoods · TikTok</p>
                </div>
              </div>
            </div>
            <Button onClick={loadCityTrends} disabled={loadingCityTrends} variant="outline" className="gap-2 rounded-full px-6">
              {loadingCityTrends ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {cityTrends ? 'Refresh' : 'Load'}
            </Button>
          </div>

          {cityTrends && cityTrends.neighborhoods && cityTrends.neighborhoods.length > 0 ? (
            <>
              {/* Neighborhood Selector Tabs */}
              <div className="flex flex-wrap gap-2">
                {cityTrends.neighborhoods.map((n: NeighborhoodData) => (
                  <button
                    key={n.neighborhood}
                    onClick={() => setSelectedCity(n.neighborhood)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCity === n.neighborhood
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
                    }`}
                  >
                    {n.neighborhood}
                    <span className="opacity-70 ml-1">· {n.city}</span>
                  </button>
                ))}
              </div>

              {currentNeighborhoodData && (
                <div className="space-y-8">
                  {/* 🌱 MICRO-TRENDS - The Gold! */}
                  {currentNeighborhoodData.microTrends && currentNeighborhoodData.microTrends.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">🌱 Emerging Micro-Trends</h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                      </div>
                      <div className="grid gap-4">
                        {currentNeighborhoodData.microTrends.map((mt: MicroTrend, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => toggleCityTrendSelection(`${selectedCity}:micro:${mt.name}`)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border ${
                              selectedCityTrends.includes(`${selectedCity}:micro:${mt.name}`)
                                ? 'bg-violet-50 border-violet-300'
                                : 'bg-white border-slate-200 hover:border-violet-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-semibold text-slate-800">{mt.name}</h5>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full"
                                    style={{ width: `${mt.confidence}%` }}
                                  />
                                </div>
                                <span className="text-xs text-violet-600 font-bold">{mt.confidence}%</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{mt.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 👕 GARMENTS */}
                  {currentNeighborhoodData.garments && currentNeighborhoodData.garments.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">👕 Rising Garments</h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentNeighborhoodData.garments.slice(0, 12).map((g: NeighborhoodGarment, idx: number) => {
                          const isSelected = selectedCityTrends.includes(`${selectedCity}:garment:${g.name}`);
                          return (
                            <button
                              key={idx}
                              onClick={() => toggleCityTrendSelection(`${selectedCity}:garment:${g.name}`)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-300'
                              }`}
                            >
                              {g.name}
                              {g.isNew && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">NEW</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grid: Styles + Brands */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* 🎨 STYLES */}
                    {currentNeighborhoodData.styles && currentNeighborhoodData.styles.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">🎨 Aesthetics</h4>
                        </div>
                        <div className="space-y-2">
                          {currentNeighborhoodData.styles.slice(0, 6).map((s: NeighborhoodStyle, idx: number) => {
                            const isSelected = selectedCityTrends.includes(`${selectedCity}:style:${s.name}`);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCityTrendSelection(`${selectedCity}:style:${s.name}`)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white border border-slate-200 hover:border-violet-200'
                                }`}
                              >
                                <span className={`font-medium ${isSelected ? '' : 'text-slate-800'}`}>{s.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-slate-500'}`}>{s.mentions} mentions</span>
                                  {s.isNew && <span className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>NEW</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 🏷️ BRANDS */}
                    {currentNeighborhoodData.brands && currentNeighborhoodData.brands.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">🏷️ Brands Mentioned</h4>
                        </div>
                        <div className="space-y-2">
                          {currentNeighborhoodData.brands.slice(0, 6).map((b: NeighborhoodBrand, idx: number) => {
                            const isSelected = selectedCityTrends.includes(`${selectedCity}:brand:${b.name}`);
                            const typeColors: Record<string, string> = {
                              'streetwear': 'bg-pink-100 text-pink-700',
                              'vintage': 'bg-amber-100 text-amber-700',
                              'vintage market': 'bg-amber-100 text-amber-700',
                              'vintage store': 'bg-amber-100 text-amber-700',
                              'luxury': 'bg-purple-100 text-purple-700',
                              'concept store': 'bg-blue-100 text-blue-700',
                              'emerging-designer': 'bg-green-100 text-green-700',
                            };
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCityTrendSelection(`${selectedCity}:brand:${b.name}`)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white border border-slate-200 hover:border-violet-200'
                                }`}
                              >
                                <span className={`font-medium ${isSelected ? '' : 'text-slate-800'}`}>{b.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : typeColors[b.type] || 'bg-slate-100 text-slate-600'}`}>
                                  {b.type}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 📍 LOCAL SPOTS */}
                  {currentNeighborhoodData.localSpots && currentNeighborhoodData.localSpots.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">📍 Local Hotspots</h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentNeighborhoodData.localSpots.map((spot: NeighborhoodSpot, idx: number) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700 flex items-center gap-2"
                          >
                            <MapPin className="h-3 w-3 text-slate-500" />
                            {spot.name}
                            <span className="text-xs text-slate-400">{spot.mentions}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Trends Summary */}
              {selectedCityTrends.length > 0 && (
                <div className="pt-6 border-t">
                  <h4 className="font-semibold flex items-center gap-2 mb-3 text-violet-600">
                    <Check className="h-4 w-4" />
                    Selected for Collection ({selectedCityTrends.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCityTrends.map((trend, i) => {
                      const parts = trend.split(':');
                      const displayName = parts.length >= 3 ? parts[2] : trend;
                      return (
                        <Badge key={i} className="bg-violet-600 hover:bg-violet-700">
                          {displayName}
                          <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleCityTrendSelection(trend); }} />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Period info */}
              <p className="text-xs text-muted-foreground text-center">
                Week {cityTrends.period} · Powered by TikTok + Gemini AI
              </p>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 mb-4">
                <MapPin className="h-8 w-8 text-violet-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Discover Street Intelligence</h4>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Real-time trends from Shoreditch, Le Marais, Williamsburg, Harajuku, Kreuzberg & Hongdae.
              </p>
              <Button onClick={loadCityTrends} disabled={loadingCityTrends} className="bg-violet-600 hover:bg-violet-700">
                {loadingCityTrends ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Load Street Intelligence
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Continue to Next Step - Now at the very end */}
      <Card className={`border-2 transition-all ${hasContent ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Ready to continue?</h3>
              <p className="text-sm text-muted-foreground">
                {hasContent 
                  ? `You have ${images.length} images${selectedBoards.length > 0 ? ` and ${selectedBoards.length} Pinterest boards` : ''}${aiAnalysis ? ' with AI analysis' : ''}${selectedTrends.colors.length + selectedTrends.trends.length + selectedTrends.items.length > 0 ? ` and ${selectedTrends.colors.length + selectedTrends.trends.length + selectedTrends.items.length} trend selections` : ''}${selectedSignals.length > 0 ? ` and ${selectedSignals.length} live signals` : ''}`
                  : 'Add some images or select Pinterest boards to continue'
                }
              </p>
            </div>
            <Button 
              onClick={handleContinue}
              disabled={!hasContent}
              size="lg"
              className="gap-2"
            >
              Continue to Strategy
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

