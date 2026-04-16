-- Pin comments: let comments anchor to a specific (x,y) on a drawing
-- slot. When drawing_slot + x + y are all null, the comment stays a
-- plain block-anchored thread entry (existing behaviour).
ALTER TABLE public.tech_pack_comments
  ADD COLUMN IF NOT EXISTS drawing_slot text,
  ADD COLUMN IF NOT EXISTS pin_x numeric,
  ADD COLUMN IF NOT EXISTS pin_y numeric;

-- drawing_slot identifies which drawing the pin is dropped onto.
-- pin_x / pin_y are percentages (0..100) so pins stay aligned when
-- the image is resized.
CREATE INDEX IF NOT EXISTS tech_pack_comments_drawing_slot_idx
  ON public.tech_pack_comments (sku_id, drawing_slot)
  WHERE drawing_slot IS NOT NULL;
