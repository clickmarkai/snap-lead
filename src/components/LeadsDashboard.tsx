import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, MessageCircle, Mail, Calendar, Grid3X3, List, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase, Lead, testConnection } from '@/lib/supabase';
import { formatDateJakarta } from '@/lib/utils';

// Supabase integration - no more mock data needed

const statusColors = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  closed: 'secondary'
} as const;

export const LeadsDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<'cards' | 'list'>('list');
  
  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  const { toast } = useToast();

  useEffect(() => {
    // Load leads from Supabase
    const loadLeads = async () => {
      setIsLoading(true);
      
      // Test connection first
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        toast({
          title: "Database Connection Failed",
          description: `Cannot connect to database: ${connectionTest.error}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading leads:', error);
          toast({
            title: "Error loading leads",
            description: `Database error: ${error.message} (Code: ${error.code})`,
            variant: "destructive",
          });
        } else {
          setLeads(data || []);
          console.log(`Successfully loaded ${data?.length || 0} leads`);
        }
      } catch (error) {
        console.error('Error loading leads:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast({
          title: "Error loading leads",
          description: `Failed to load leads: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLeads();
  }, []);

  // Filtered and sorted leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.whatsapp.includes(searchTerm) ||
        (lead.notes && lead.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [leads, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const exportToXLSX = () => {
    try {
      const exportData = leads.map(lead => ({
        Email: lead.email,
        WhatsApp: lead.whatsapp,
        Status: lead.status,
        Source: lead.source,
        'Created Date': formatDateJakarta(lead.created_at),
        Notes: lead.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;

      const fileName = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `${leads.length} leads exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export leads to XLSX",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateJakarta(dateString);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leads Dashboard</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedLeads.length} of {leads.length} leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewType === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('cards')}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={exportToXLSX} variant="outline">
            <Download className="h-4 w-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="dashboard-filters flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, phone, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
          const [field, order] = value.split('-');
          setSortBy(field as 'created_at' | 'email' | 'status');
          setSortOrder(order as 'asc' | 'desc');
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Latest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
            <SelectItem value="email-asc">Email A-Z</SelectItem>
            <SelectItem value="email-desc">Email Z-A</SelectItem>
            <SelectItem value="status-asc">Status A-Z</SelectItem>
            <SelectItem value="status-desc">Status Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards View */}
      {viewType === 'cards' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedLeads.map((lead, index) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              {/* Lead Image */}
              {lead.image_url && (
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <img
                    src={lead.image_url}
                    alt={`Photo of ${lead.email.split('@')[0]}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold truncate">
                    {lead.email.split('@')[0]}
                  </CardTitle>
                  <Badge variant={statusColors[lead.status]}>
                    {lead.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Lead #{(currentPage - 1) * itemsPerPage + index + 1}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </div>
                
                {lead.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lead.notes}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <span className="text-xs text-muted-foreground">
                    Source: {lead.source}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewType === 'list' && (
        <div className="space-y-3">
          {paginatedLeads.map((lead, index) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Lead Image - small thumbnail */}
                    {lead.image_url && (
                      <div className="w-12 h-12 relative overflow-hidden rounded-full flex-shrink-0">
                        <img
                          src={lead.image_url}
                          alt={`Photo of ${lead.email.split('@')[0]}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image if it fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                      {/* Lead ID & Email */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">Lead #{(currentPage - 1) * itemsPerPage + index + 1}</h3>
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      </div>
                    
                    {/* WhatsApp Contact */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        <span>{lead.whatsapp}</span>
                      </div>
                    </div>
                    
                    {/* Date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Status & Source */}
                    <div className="space-y-1">
                      <Badge variant={statusColors[lead.status]} className="text-xs">
                        {lead.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Source: {lead.source}
                      </p>
                    </div>
                                      </div>
                  </div>
                </div>
                
                {/* Notes - Full width */}
                
                {/* Notes - Full width */}
                {lead.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Notes:</strong> {lead.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedLeads.length)} of {filteredAndSortedLeads.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="w-9 h-9"
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-2 text-muted-foreground">...</span>}
                </>
              )}
              
              {/* Pages around current page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                
                if (page < 1 || page > totalPages) return null;
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-9 h-9"
                  >
                    {page}
                  </Button>
                );
              }).filter(Boolean)}
              
              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-muted-foreground">...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-9 h-9"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-9 px-3"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {filteredAndSortedLeads.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No leads match your search criteria. Try adjusting your filters.'
                : 'No leads found. Start by capturing some photos!'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};