import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink, X, Filter } from "lucide-react";
import { useNotifications, AppNotification, NotificationSeverity } from "@/lib/notifications";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();
  const { user } = useUser();
  const navigate = useNavigate();

  const [filterUnread, setFilterUnread] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filterUnread === "unread" && n.isRead) return false;
      if (filterSeverity !== "all" && n.severity !== filterSeverity) return false;
      return true;
    });
  }, [notifications, filterUnread, filterSeverity]);

  const metrics = useMemo(() => {
    return {
      warnings: notifications.filter(n => n.severity === 'warning').length,
      financial: notifications.filter(n => ['payment_received', 'reimbursement_pending', 'client_reimbursable_pending'].includes(n.type)).length,
      leadsEstimates: notifications.filter(n => ['new_lead', 'estimate_approved'].includes(n.type)).length,
      needsReview: notifications.filter(n => n.type === 'tax_needs_review' || n.type === 'expense_missing_file').length,
    };
  }, [notifications]);

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getSeverityBg = (severity: NotificationSeverity, isRead: boolean) => {
    if (isRead) return "bg-gray-50 border-gray-100 opacity-70";
    switch (severity) {
      case 'info': return "bg-blue-50/30 border-blue-100";
      case 'warning': return "bg-yellow-50/30 border-yellow-100";
      case 'error': return "bg-red-50/30 border-red-100";
      case 'success': return "bg-green-50/30 border-green-100";
    }
  };

  if (user?.organization?.role === 'worker') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-red-500 font-bold">Access Denied: Workers cannot view the Notifications Center yet.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0b2a4a] flex items-center gap-2">
            <Bell className="h-8 w-8 text-blue-600" />
            Notifications Center
          </h1>
          <p className="text-gray-500 mt-1">Manage system alerts, financial updates, and tasks needing review.</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
              <Check className="h-4 w-4 mr-2" /> Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`${unreadCount > 0 ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200'} shadow-sm`}>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider opacity-80">Unread</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-yellow-600 font-semibold uppercase tracking-wider">Warnings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xl font-bold text-gray-900">{metrics.warnings}</CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-green-600 font-semibold uppercase tracking-wider">Financial</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xl font-bold text-gray-900">{metrics.financial}</CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Leads/Estimates</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xl font-bold text-gray-900">{metrics.leadsEstimates}</CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-red-600 font-semibold uppercase tracking-wider">Needs Review</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xl font-bold text-gray-900">{metrics.needsReview}</CardContent>
        </Card>
      </div>

      {/* Filters & List */}
      <Card>
        <CardHeader className="bg-gray-50/50 border-b flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={filterUnread} onValueChange={setFilterUnread}>
              <SelectTrigger className="w-32 h-8 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notifications</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-32 h-8 text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Showing {filteredNotifications.length} items
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No notifications match your filters.</p>
              </div>
            ) : (
              filteredNotifications.map((notif: AppNotification) => (
                <div key={notif.id} className={`p-4 flex gap-4 items-start transition-colors border-l-4 ${getSeverityBg(notif.severity, notif.isRead)} ${notif.isRead ? 'border-l-transparent' : 'border-l-blue-500'}`}>
                  
                  <div className="mt-1 shrink-0">{getSeverityIcon(notif.severity)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`font-semibold text-sm ${notif.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{notif.title}</h4>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className={`text-sm ${notif.isRead ? 'text-gray-500' : 'text-gray-700'}`}>{notif.message}</p>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-7 text-xs font-semibold"
                        onClick={() => {
                          if (!notif.isRead) markAsRead(notif.id);
                          navigate(notif.link);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Open Details
                      </Button>
                      
                      {!notif.isRead && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => markAsRead(notif.id)}>
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => dismiss(notif.id)} title="Dismiss">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
