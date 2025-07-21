import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { TimeFilter } from '@/types/flytbase';

interface DateRangeFilterProps {
  selectedFilter: TimeFilter;
  customRange: { start: Date; end: Date };
  onFilterChange: (filter: TimeFilter) => void;
  onCustomRangeChange: (range: { start: Date; end: Date }) => void;
  timeFilters: TimeFilter[];
}

export default function DateRangeFilter({
  selectedFilter,
  customRange,
  onFilterChange,
  onCustomRangeChange,
  timeFilters
}: DateRangeFilterProps) {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    const filter = timeFilters.find(f => f.value === value);
    if (filter) {
      onFilterChange(filter);
      if (value !== 'custom') {
        setShowCustomDatePicker(false);
      } else {
        setShowCustomDatePicker(true);
      }
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onCustomRangeChange({
        start: date,
        end: customRange.end
      });
      setStartDateOpen(false);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      onCustomRangeChange({
        start: customRange.start,
        end: date
      });
      setEndDateOpen(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedFilter.value} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {timeFilters.map((filter) => (
            <SelectItem key={filter.value} value={filter.value}>
              {filter.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(selectedFilter.value === 'custom' || showCustomDatePicker) && (
        <div className="flex items-center space-x-2">
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.start ? format(customRange.start, 'MMM dd, yyyy') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.start}
                onSelect={handleStartDateChange}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-gray-500">to</span>

          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.end ? format(customRange.end, 'MMM dd, yyyy') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.end}
                onSelect={handleEndDateChange}
                disabled={(date) => date > new Date() || date < customRange.start}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}