import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  PlayCircle, 
  PauseCircle, 
  RefreshCw, 
  Clock, 
  Coffee, 
  Brain,
  Volume2,
  VolumeX
} from "lucide-react";

type TimerMode = "focus" | "shortBreak" | "longBreak";

interface TimerSettings {
  focusTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  longBreakInterval: number;
}

export function StudyTimer() {
  const { toast } = useToast();
  
  // Timer settings (in minutes)
  const [settings, setSettings] = useState<TimerSettings>({
    focusTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    longBreakInterval: 4
  });
  
  const [timeLeft, setTimeLeft] = useState(settings.focusTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    // Fallback to a beep sound if the file doesn't exist
    audioRef.current.onerror = () => {
      console.log("Audio file not found, using fallback");
      audioRef.current = null;
    };
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Handle timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);
  
  // Reset timer when mode changes
  useEffect(() => {
    switch (mode) {
      case "focus":
        setTimeLeft(settings.focusTime * 60);
        break;
      case "shortBreak":
        setTimeLeft(settings.shortBreakTime * 60);
        break;
      case "longBreak":
        setTimeLeft(settings.longBreakTime * 60);
        break;
    }
  }, [mode, settings]);
  
  const handleTimerComplete = () => {
    // Play sound if enabled
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Error playing sound", e));
    }
    
    if (mode === "focus") {
      const newSessionsCompleted = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCompleted);
      
      // Determine if it's time for a long break
      if (newSessionsCompleted % settings.longBreakInterval === 0) {
        setMode("longBreak");
        toast({
          title: "Focus session complete!",
          description: "Time for a long break. You've earned it!",
        });
      } else {
        setMode("shortBreak");
        toast({
          title: "Focus session complete!",
          description: "Take a short break before continuing.",
        });
      }
    } else {
      // Break is over, back to focus
      setMode("focus");
      toast({
        title: "Break time is over",
        description: "Ready to focus again?",
      });
    }
    
    setIsRunning(false);
  };
  
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };
  
  const resetTimer = () => {
    if (isRunning) {
      setIsRunning(false);
    }
    
    switch (mode) {
      case "focus":
        setTimeLeft(settings.focusTime * 60);
        break;
      case "shortBreak":
        setTimeLeft(settings.shortBreakTime * 60);
        break;
      case "longBreak":
        setTimeLeft(settings.longBreakTime * 60);
        break;
    }
  };
  
  const setActiveMode = (newMode: TimerMode) => {
    if (isRunning) {
      // Ask for confirmation before changing mode while timer is running
      const confirmed = window.confirm("Timer is still running. Change mode anyway?");
      if (!confirmed) return;
      
      setIsRunning(false);
    }
    
    setMode(newMode);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get progress percentage
  const getProgress = () => {
    let totalTime;
    switch (mode) {
      case "focus":
        totalTime = settings.focusTime * 60;
        break;
      case "shortBreak":
        totalTime = settings.shortBreakTime * 60;
        break;
      case "longBreak":
        totalTime = settings.longBreakTime * 60;
        break;
      default:
        totalTime = settings.focusTime * 60;
    }
    
    return ((totalTime - timeLeft) / totalTime) * 100;
  };
  
  // Handle settings change
  const updateSetting = (key: keyof TimerSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Study Timer
        </CardTitle>
        <CardDescription>Focus and break timer with Pomodoro technique</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant={mode === "focus" ? "default" : "outline"} 
              onClick={() => setActiveMode("focus")}
              className="flex items-center justify-center"
            >
              <Brain className="mr-1 h-4 w-4" />
              Focus
            </Button>
            <Button 
              variant={mode === "shortBreak" ? "default" : "outline"} 
              onClick={() => setActiveMode("shortBreak")}
              className="flex items-center justify-center"
            >
              <Coffee className="mr-1 h-4 w-4" />
              Short Break
            </Button>
            <Button 
              variant={mode === "longBreak" ? "default" : "outline"} 
              onClick={() => setActiveMode("longBreak")}
              className="flex items-center justify-center"
            >
              <Coffee className="mr-1 h-4 w-4" />
              Long Break
            </Button>
          </div>
          
          {/* Timer Display */}
          <div 
            className={`relative rounded-full aspect-square flex items-center justify-center border-8 ${
              mode === "focus" ? "border-primary" : "border-blue-400"
            } mt-6 mb-4 mx-auto w-48 h-48 text-4xl font-bold select-none`}
            style={{
              background: `conic-gradient(
                ${mode === "focus" ? "rgb(var(--primary))" : "rgb(96, 165, 250)"} ${getProgress()}%, 
                transparent ${getProgress()}% 100%
              )`
            }}
          >
            <div className="flex items-center justify-center rounded-full bg-background w-[85%] h-[85%] z-10">
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="flex justify-center space-x-4">
            <Button 
              size="icon" 
              variant="outline" 
              className="h-10 w-10 rounded-full"
              onClick={toggleTimer}
            >
              {isRunning ? (
                <PauseCircle className="h-6 w-6" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
            </Button>
            
            <Button 
              size="icon" 
              variant="outline" 
              className="h-10 w-10 rounded-full"
              onClick={resetTimer}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            
            <Button 
              size="icon" 
              variant="outline" 
              className="h-10 w-10 rounded-full"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* Session Counter */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            <span>Sessions completed: {sessionsCompleted}</span>
          </div>
          
          {/* Settings */}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full"
            >
              {showSettings ? "Hide Settings" : "Show Settings"}
            </Button>
            
            {showSettings && (
              <div className="mt-4 space-y-4 p-4 border rounded-md">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm">Focus Time: {settings.focusTime} min</label>
                  </div>
                  <Slider 
                    value={[settings.focusTime]} 
                    min={5} 
                    max={60} 
                    step={5}
                    onValueChange={value => updateSetting("focusTime", value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm">Short Break: {settings.shortBreakTime} min</label>
                  </div>
                  <Slider 
                    value={[settings.shortBreakTime]} 
                    min={1} 
                    max={15} 
                    step={1}
                    onValueChange={value => updateSetting("shortBreakTime", value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm">Long Break: {settings.longBreakTime} min</label>
                  </div>
                  <Slider 
                    value={[settings.longBreakTime]} 
                    min={5} 
                    max={30} 
                    step={5}
                    onValueChange={value => updateSetting("longBreakTime", value[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm">Long Break After: {settings.longBreakInterval} sessions</label>
                  </div>
                  <Slider 
                    value={[settings.longBreakInterval]} 
                    min={1} 
                    max={6} 
                    step={1}
                    onValueChange={value => updateSetting("longBreakInterval", value[0])}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <p>
          The Pomodoro Technique helps improve focus and productivity with timed work sessions and breaks.
        </p>
      </CardFooter>
    </Card>
  );
}
