import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import BusinessProfileCard from "@/components/BusinessProfileCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Store, ShoppingBag, Loader2, Trash2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface BusinessProfile {
  id: string;
  business_name: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  profile_id: string;
}

interface CatalogueItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  in_stock: boolean;
  business_profile_id: string;
}

const CATEGORIES = [
  "Restaurant",
  "Retail",
  "Services",
  "Technology",
  "Healthcare",
  "Education",
  "Entertainment",
  "Fashion",
  "Beauty",
  "Fitness",
  "Real Estate",
  "Other",
];

const Business = () => {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [myBusiness, setMyBusiness] = useState<BusinessProfile | null>(null);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  
  // Business form
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Catalogue item form
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCurrency, setItemCurrency] = useState("USD");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemInStock, setItemInStock] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUser(session.user);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all businesses
      const { data: allBusinesses, error: bizError } = await supabase
        .from("business_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (bizError) throw bizError;

      // Fetch my business
      const { data: mine } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      setBusinesses(allBusinesses || []);
      setMyBusiness(mine);

      // If I have a business, fetch my catalogue
      if (mine) {
        const { data: items } = await supabase
          .from("catalogue_items")
          .select("*")
          .eq("business_profile_id", mine.id);
        setCatalogueItems(items || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBusiness = async () => {
    if (!businessName.trim()) return;

    try {
      const { error } = await supabase.from("business_profiles").insert({
        business_name: businessName.trim(),
        description: description.trim() || null,
        category: category || null,
        website: website.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        profile_id: user.id,
      });

      if (error) throw error;

      toast({ title: "Business created!", description: "Your business profile is now live" });
      setShowCreate(false);
      resetBusinessForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetBusinessForm = () => {
    setBusinessName("");
    setDescription("");
    setCategory("");
    setWebsite("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const addCatalogueItem = async () => {
    if (!itemName.trim() || !myBusiness) return;

    try {
      const { error } = await supabase.from("catalogue_items").insert({
        business_profile_id: myBusiness.id,
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        price: parseFloat(itemPrice) || 0,
        currency: itemCurrency,
        image_url: itemImageUrl || null,
        in_stock: itemInStock,
      });

      if (error) throw error;

      toast({ title: "Product added!", description: "Your product is now in the catalogue" });
      setShowAddItem(false);
      resetItemForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetItemForm = () => {
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemCurrency("USD");
    setItemImageUrl("");
    setItemInStock(true);
  };

  const handleItemImageUpload = async (file: File) => {
    if (!user) return;
    const result = await uploadFile(file, "media", user.id);
    if (result) {
      setItemImageUrl(result.url);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await supabase.from("catalogue_items").delete().eq("id", itemId);
      toast({ title: "Product deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const viewCatalogue = async (business: BusinessProfile) => {
    setSelectedBusiness(business);
    const { data } = await supabase
      .from("catalogue_items")
      .select("*")
      .eq("business_profile_id", business.id);
    setCatalogueItems(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-6xl mx-auto pt-20 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Business Directory
            </h1>
            <p className="text-muted-foreground">Discover and connect with businesses</p>
          </div>
          
          {!myBusiness && (
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Business
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Business Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Business name *"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    rows={3}
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website URL"
                  />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Business email"
                  />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                  />
                  <Button onClick={createBusiness} disabled={!businessName.trim()} className="w-full">
                    Create Business
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue={myBusiness ? "my-business" : "discover"} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Discover
            </TabsTrigger>
            {myBusiness && (
              <>
                <TabsTrigger value="my-business">My Business</TabsTrigger>
                <TabsTrigger value="catalogue" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  My Catalogue
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="discover">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((business) => (
                <BusinessProfileCard
                  key={business.id}
                  business={business}
                  onViewCatalogue={() => viewCatalogue(business)}
                />
              ))}
              {businesses.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No businesses yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {myBusiness && (
            <>
              <TabsContent value="my-business">
                <div className="max-w-md">
                  <BusinessProfileCard
                    business={myBusiness}
                    catalogueItems={catalogueItems}
                    onViewCatalogue={() => {}}
                  />
                </div>
              </TabsContent>

              <TabsContent value="catalogue">
                <div className="mb-6">
                  <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Product</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="Product name *"
                        />
                        <Textarea
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          placeholder="Description"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value)}
                            placeholder="Price"
                            className="flex-1"
                          />
                          <Select value={itemCurrency} onValueChange={setItemCurrency}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="INR">INR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {itemImageUrl ? (
                          <div className="relative">
                            <img src={itemImageUrl} alt="Product" className="w-full h-32 object-cover rounded-lg" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => setItemImageUrl("")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleItemImageUpload(file);
                              }}
                              className="hidden"
                              id="product-image-upload"
                            />
                            <label 
                              htmlFor="product-image-upload" 
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {uploading ? "Uploading..." : "Click to upload image"}
                              </span>
                            </label>
                          </div>
                        )}
                        
                        <Button onClick={addCatalogueItem} disabled={!itemName.trim()} className="w-full">
                          Add Product
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {catalogueItems.map((item) => (
                    <div key={item.id} className="bg-card rounded-lg shadow-subtle hairline overflow-hidden group">
                      <div className="aspect-square bg-muted relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {!item.in_stock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-medium">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                        <p className="font-semibold text-primary mt-1">
                          {item.currency} {item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {catalogueItems.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No products yet</p>
                      <Button onClick={() => setShowAddItem(true)} className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Product
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Catalogue View Dialog */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedBusiness?.business_name} - Catalogue</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {catalogueItems.map((item) => (
                <div key={item.id} className="bg-muted rounded-lg overflow-hidden">
                  <div className="aspect-square">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <p className="text-sm text-primary font-semibold">
                      {item.currency} {item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {catalogueItems.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No products available</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Business;
