import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'collection-assets';
const FOLDER = 'aimily-models';

const models = [
  {file:'Mara.png',name:'Mara',gender:'female',complexion:'olive',hair_style:'medium straight',hair_color:'dark brown',age_range:'20s',ethnicity:'Mediterranean',description:'Mediterranean, green-hazel eyes, angular jawline',sort_order:1},
  {file:'Yuki.png',name:'Yuki',gender:'female',complexion:'light',hair_style:'long straight',hair_color:'black',age_range:'20s',ethnicity:'East Asian',description:'East Asian, sleek black hair, sharp angular features',sort_order:2},
  {file:'Priya.png',name:'Priya',gender:'female',complexion:'medium',hair_style:'long straight',hair_color:'black',age_range:'20s',ethnicity:'South Asian',description:'South Asian, warm brown skin, long black hair',sort_order:3},
  {file:'Noa.png',name:'Noa',gender:'female',complexion:'medium',hair_style:'curly voluminous',hair_color:'brown',age_range:'20s',ethnicity:'Mixed',description:'Mixed heritage, big afro curly hair, hazel-green eyes',sort_order:4},
  {file:'Zhara.png',name:'Zhara',gender:'female',complexion:'tan',hair_style:'long straight',hair_color:'black',age_range:'20s',ethnicity:'Afro-Latina',description:'Afro-Latina, medium-dark skin, long straight black hair',sort_order:5},
  {file:'Astrid.png',name:'Astrid',gender:'female',complexion:'light',hair_style:'short wavy',hair_color:'chestnut',age_range:'20s',ethnicity:'European',description:'European, freckles, short wavy chestnut hair',sort_order:6},
  {file:'Amara.png',name:'Amara',gender:'female',complexion:'dark',hair_style:'braids',hair_color:'black',age_range:'20s',ethnicity:'East African',description:'East African, deep dark skin, cornrows, sculptural',sort_order:7},
  {file:'Suki.png',name:'Suki',gender:'female',complexion:'light',hair_style:'medium wavy',hair_color:'dark blonde',age_range:'20s',ethnicity:'Slavic',description:'Slavic, fair skin, wavy dark blonde hair',sort_order:8},
  {file:'Liv.png',name:'Liv',gender:'female',complexion:'light',hair_style:'long curly',hair_color:'blonde',age_range:'20s',ethnicity:'Nordic',description:'Nordic, wild curly blonde hair, freckles',sort_order:9},
  {file:'Saga.png',name:'Saga',gender:'female',complexion:'light',hair_style:'long wavy',hair_color:'blonde',age_range:'20s',ethnicity:'Nordic',description:'Nordic, long wavy blonde hair, intense stare',sort_order:10},
  {file:'Le\u00efla.png',name:'Le\u00efla',gender:'female',complexion:'olive',hair_style:'long straight',hair_color:'dark brown',age_range:'20s',ethnicity:'Middle Eastern',description:'Middle Eastern, olive-tan skin, dark almond eyes',sort_order:11},
  {file:'Sol.png',name:'Sol',gender:'female',complexion:'tan',hair_style:'updo',hair_color:'dirty blonde',age_range:'20s',ethnicity:'Scandinavian',description:'Scandinavian bronzed, pulled-back dirty blonde',sort_order:12},
  {file:'Irina.png',name:'Irina',gender:'female',complexion:'light',hair_style:'buzz',hair_color:'platinum',age_range:'20s',ethnicity:'Northern European',description:'Platinum buzz cut, freckles, punk editorial',sort_order:13},
  {file:'Nia.png',name:'Nia',gender:'female',complexion:'dark',hair_style:'short cropped',hair_color:'black',age_range:'20s',ethnicity:'Black',description:'Black, luminous dark skin, short cropped hair',sort_order:14},
  {file:'Marco.png',name:'Marco',gender:'male',complexion:'olive',hair_style:'medium tousled',hair_color:'dark brown',age_range:'20s',ethnicity:'Mediterranean',description:'Mediterranean, stubble, tousled dark hair',sort_order:15},
  {file:'Hiro.png',name:'Hiro',gender:'male',complexion:'light',hair_style:'swept back',hair_color:'black',age_range:'20s',ethnicity:'East Asian',description:'East Asian, sleek black hair swept back',sort_order:16},
  {file:'Arjun.png',name:'Arjun',gender:'male',complexion:'medium',hair_style:'medium textured',hair_color:'black',age_range:'20s',ethnicity:'South Asian',description:'South Asian, short groomed beard, thick dark hair',sort_order:17},
  {file:'Kai.png',name:'Kai',gender:'male',complexion:'medium',hair_style:'curly afro',hair_color:'brown',age_range:'20s',ethnicity:'Mixed',description:'Mixed heritage, big natural curly hair',sort_order:18},
  {file:'Dante.png',name:'Dante',gender:'male',complexion:'tan',hair_style:'short fade',hair_color:'black',age_range:'20s',ethnicity:'Afro-Latino',description:'Afro-Latino, medium-dark skin, short fade',sort_order:19},
  {file:'Axel.png',name:'Axel',gender:'male',complexion:'light',hair_style:'short wavy',hair_color:'chestnut',age_range:'20s',ethnicity:'European',description:'European, freckles, wavy chestnut hair, stubble',sort_order:20},
  {file:'Idris.png',name:'Idris',gender:'male',complexion:'dark',hair_style:'buzz',hair_color:'black',age_range:'20s',ethnicity:'East African',description:'East African, deep dark skin, buzz cut',sort_order:21},
  {file:'Nikolai.png',name:'Nikolai',gender:'male',complexion:'light',hair_style:'medium wavy',hair_color:'dark blonde',age_range:'20s',ethnicity:'Slavic',description:'Slavic, fair skin, wavy dark blonde, stubble',sort_order:22},
  {file:'Bjorn.png',name:'Bjorn',gender:'male',complexion:'light',hair_style:'medium curly',hair_color:'dirty blonde',age_range:'20s',ethnicity:'Nordic',description:'Nordic, wild curly dirty blonde, freckles',sort_order:23},
  {file:'Erik.png',name:'Erik',gender:'male',complexion:'light',hair_style:'swept back',hair_color:'blonde',age_range:'20s',ethnicity:'Scandinavian',description:'Scandinavian, classic blonde swept back',sort_order:24},
  {file:'Rami.png',name:'Rami',gender:'male',complexion:'olive',hair_style:'short textured',hair_color:'dark brown',age_range:'20s',ethnicity:'Middle Eastern',description:'Middle Eastern, olive-tan skin, short dark beard',sort_order:25},
  {file:'Teo.png',name:'Teo',gender:'male',complexion:'tan',hair_style:'slicked back',hair_color:'dirty blonde',age_range:'20s',ethnicity:'Australian',description:'Bronzed surfer, slicked-back dirty blonde',sort_order:26},
  {file:'Sasha.png',name:'Sasha',gender:'male',complexion:'light',hair_style:'buzz',hair_color:'platinum',age_range:'20s',ethnicity:'Northern European',description:'Platinum buzz cut, freckles, punk editorial',sort_order:27},
  {file:'Kofi.png',name:'Kofi',gender:'male',complexion:'dark',hair_style:'short cropped',hair_color:'black',age_range:'20s',ethnicity:'Black',description:'Black, luminous dark skin, short cropped',sort_order:28},
];

async function run() {
  let ok = 0;
  for (const m of models) {
    const fp = 'scripts/model-references/' + m.file;
    if (!fs.existsSync(fp)) { console.error('MISSING:', fp); continue; }
    const buf = fs.readFileSync(fp);
    const sn = m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '.png';
    const sp = FOLDER + '/' + sn;

    const { error: ue } = await supabase.storage.from(BUCKET).upload(sp, buf, { contentType: 'image/png', upsert: true });
    if (ue) { console.error('UPL:', m.name, ue.message); continue; }

    const { data: ud } = supabase.storage.from(BUCKET).getPublicUrl(sp);

    const { error: ie } = await supabase.from('aimily_models').upsert({
      name: m.name, gender: m.gender, headshot_url: ud.publicUrl,
      complexion: m.complexion, hair_style: m.hair_style, hair_color: m.hair_color,
      age_range: m.age_range, ethnicity: m.ethnicity, description: m.description,
      sort_order: m.sort_order, is_active: true,
    }, { onConflict: 'name' });
    if (ie) { console.error('INS:', m.name, ie.message); continue; }

    console.log('✓', m.name);
    ok++;
  }
  console.log('=== Done:', ok, '/28 ===');
}
run();
