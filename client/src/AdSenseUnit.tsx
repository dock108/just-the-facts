import { useEffect, useRef } from 'react';

interface AdSenseUnitProps {
  adSlot: string;
  adClient: string;
}

const AdSenseUnit = ({ adSlot, adClient }: AdSenseUnitProps) => {
  const adPushedRef = useRef(false); // Ref to track if ad push was attempted

  useEffect(() => {
    // Only attempt push if it hasn't been attempted for this instance
    if (!adPushedRef.current) {
      try {
        // Try to push the ad after the component mounts
        console.log(`Attempting AdSense push for slot: ${adSlot}`);
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        // Mark as attempted *after* the push call
        adPushedRef.current = true;
      } catch (e) {
        console.error(`AdSense Error for slot ${adSlot}:`, e);
      }
    }
  }, [adSlot]); // Re-run if adSlot changes (though unlikely here)

  return (
    <ins 
      key={adSlot} 
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
};

export default AdSenseUnit; 