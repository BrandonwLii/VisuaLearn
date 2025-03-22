import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from './components/ui/card'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


import './App.css'

function App() {

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Card>
          <CardHeader className='inline-flex justify-between'>
            <div className='inline-flex items-center'>
              <Avatar className='mr-2'>
                <AvatarImage src="@/assets/logo.png" />
                <AvatarFallback>VL</AvatarFallback>
              </Avatar>
              <CardTitle className='text-3xl'>VirtuaLearn</CardTitle>
            </div>

            <div className='items-center'>
              <Button variant="outline" className='mr-3'>Settings</Button>
              <ModeToggle></ModeToggle>
            </div>
          </CardHeader>
          <CardContent>
            map over messages here
            <ScrollArea>hello cro vewtrlonjiewvtrnjlevrnjltlnjioevrnjlioevrnjlevvnhjlkevgrnjlkh</ScrollArea>
          </CardContent>
          <CardFooter>
            <Input className='mr-5'></Input>
            <Button>Ask</Button>
          </CardFooter>
        </Card>
      </ThemeProvider >
    </>
  )
}

export default App
