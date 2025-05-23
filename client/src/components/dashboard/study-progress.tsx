import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, BarChart2, Activity, PlusCircle, Trash2 } from "lucide-react";

interface StudyGoal {
  id: string;
  subject: string;
  targetHours: number;
  completedHours: number;
  color: string;
}

export function StudyProgressTracker() {
  const { toast } = useToast();
  const [studyGoals, setStudyGoals] = useState<StudyGoal[]>([
    { 
      id: '1', 
      subject: 'Mathematics', 
      targetHours: 10, 
      completedHours: 4.5,
      color: 'bg-blue-500' 
    },
    { 
      id: '2', 
      subject: 'Computer Science', 
      targetHours: 8, 
      completedHours: 5.5,
      color: 'bg-green-500' 
    },
    { 
      id: '3', 
      subject: 'Physics', 
      targetHours: 6, 
      completedHours: 2,
      color: 'bg-purple-500' 
    }
  ]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState<{subject: string; targetHours: number}>({
    subject: '',
    targetHours: 5
  });
  
  const totalHoursStudied = studyGoals.reduce((total, goal) => total + goal.completedHours, 0);
  const totalTargetHours = studyGoals.reduce((total, goal) => total + goal.targetHours, 0);
  const overallProgress = Math.round((totalHoursStudied / totalTargetHours) * 100) || 0;
  
  // Generate color for new goals
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'];
  
  const addStudyTime = (goalId: string, hours: number) => {
    setStudyGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, completedHours: Math.min(goal.completedHours + hours, goal.targetHours) } 
          : goal
      )
    );
    
    toast({
      title: "Study time added",
      description: `Added ${hours} hour${hours === 1 ? '' : 's'} to your study log.`,
    });
  };
  
  const handleAddGoal = () => {
    if (!newGoal.subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject name",
        variant: "destructive"
      });
      return;
    }
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setStudyGoals(prev => [
      ...prev, 
      {
        id: Date.now().toString(),
        subject: newGoal.subject,
        targetHours: newGoal.targetHours,
        completedHours: 0,
        color: randomColor
      }
    ]);
    
    setNewGoal({ subject: '', targetHours: 5 });
    setShowAddForm(false);
    
    toast({
      title: "Goal added",
      description: `New study goal for ${newGoal.subject} has been added.`,
    });
  };
  
  const removeGoal = (goalId: string) => {
    setStudyGoals(prev => prev.filter(goal => goal.id !== goalId));
    
    toast({
      title: "Goal removed",
      description: "Your study goal has been removed.",
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart2 className="mr-2 h-5 w-5" />
          Study Progress Tracker
        </CardTitle>
        <CardDescription>Track your study goals and progress</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                <span>{totalHoursStudied} hours studied</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                <span>{totalTargetHours} hours target</span>
              </div>
            </div>
          </div>
          
          {/* Individual goals */}
          <div className="space-y-3">
            {studyGoals.map(goal => {
              const percentComplete = Math.round((goal.completedHours / goal.targetHours) * 100);
              
              return (
                <div key={goal.id} className="border rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${goal.color} mr-2`}></div>
                      <span className="font-medium text-sm">{goal.subject}</span>
                    </div>
                    <button 
                      onClick={() => removeGoal(goal.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between text-xs mb-2">
                    <span>{goal.completedHours} / {goal.targetHours} hours</span>
                    <span>{percentComplete}%</span>
                  </div>
                  
                  <Progress value={percentComplete} className="h-1.5 mb-2" />
                  
                  <div className="flex space-x-1 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => addStudyTime(goal.id, 0.5)}
                    >
                      +30min
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => addStudyTime(goal.id, 1)}
                    >
                      +1h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => addStudyTime(goal.id, 2)}
                    >
                      +2h
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Add new goal form */}
          {showAddForm ? (
            <div className="border rounded-lg p-3 mt-4">
              <h4 className="font-medium text-sm mb-3">Add New Study Goal</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={newGoal.subject}
                    onChange={(e) => setNewGoal({...newGoal, subject: e.target.value})}
                    className="w-full px-3 py-1 text-sm border rounded"
                    placeholder="e.g. Chemistry"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Target Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newGoal.targetHours}
                    onChange={(e) => setNewGoal({...newGoal, targetHours: Number(e.target.value)})}
                    className="w-full px-3 py-1 text-sm border rounded"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleAddGoal}>Add Goal</Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2" 
              onClick={() => setShowAddForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Study Goal
            </Button>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground flex items-center">
        <Activity className="h-3 w-3 mr-1" />
        <span>Last updated: {new Date().toLocaleDateString()}</span>
      </CardFooter>
    </Card>
  );
}
