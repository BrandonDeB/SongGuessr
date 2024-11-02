import java.io.File;
import java.io.FileNotFoundException;
import java.util.Scanner;
import java.io.*;


public class dumpParser{

    public static void main(String[] args ){

    try{
        File dump= new File("junk.txt");
        File re_dump= new File("condensed-dump.json");

         try{
            re_dump.createNewFile();

          } catch(Exception e){
             System.out.println("File existed prior!");
        }
        Scanner scan= new Scanner(dump);
        FileWriter fr = new FileWriter(re_dump, true);
        BufferedWriter br =new BufferedWriter(fr);
        while(scan.hasNextLine()){
            String data = scan.nextLine();
            br.write(data+"\n");
            System.out.println(data);
        }
        scan.close();
        br.close();
        fr.close();
    }

    catch (FileNotFoundException fne){
        System.out.println("The specified file could not be located!");
        fne.printStackTrace();
    }
    catch(Exception e ){
    e.printStackTrace();}
    }



}