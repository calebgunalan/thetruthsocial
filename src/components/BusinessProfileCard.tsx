import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin,
  ShoppingBag 
} from "lucide-react";

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  in_stock: boolean;
}

interface BusinessProfileCardProps {
  business: {
    id: string;
    business_name: string;
    description: string | null;
    category: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  catalogueItems?: CatalogueItem[];
  onViewCatalogue?: () => void;
}

const BusinessProfileCard = ({ business, catalogueItems = [], onViewCatalogue }: BusinessProfileCardProps) => {
  return (
    <div className="bg-card rounded-lg shadow-subtle hairline overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-silver">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-card flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{business.business_name}</h2>
            {business.category && (
              <span className="text-sm text-muted-foreground">{business.category}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {business.description && (
        <div className="p-4 hairline-b">
          <p className="text-sm text-muted-foreground">{business.description}</p>
        </div>
      )}

      {/* Contact Info */}
      <div className="p-4 space-y-3">
        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm hover:text-primary transition-smooth"
          >
            <Globe className="w-4 h-4 text-muted-foreground" />
            {business.website}
          </a>
        )}
        
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex items-center gap-3 text-sm hover:text-primary transition-smooth"
          >
            <Phone className="w-4 h-4 text-muted-foreground" />
            {business.phone}
          </a>
        )}
        
        {business.email && (
          <a
            href={`mailto:${business.email}`}
            className="flex items-center gap-3 text-sm hover:text-primary transition-smooth"
          >
            <Mail className="w-4 h-4 text-muted-foreground" />
            {business.email}
          </a>
        )}
        
        {business.address && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {business.address}
          </div>
        )}
      </div>

      {/* Catalogue Preview */}
      {catalogueItems.length > 0 && (
        <div className="hairline-t p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Products
            </h3>
            <Button variant="ghost" size="sm" onClick={onViewCatalogue}>
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {catalogueItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-lg hairline overflow-hidden relative group"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-end p-2">
                  <div className="text-white">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs">
                      {item.currency} {item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfileCard;