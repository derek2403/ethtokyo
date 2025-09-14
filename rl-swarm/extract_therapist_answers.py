#!/usr/bin/env python3
"""
Extract therapist answers from the supervisor_content.txt file.
This script helps organize and extract just the therapist answers from the complete log.
"""

import os
import re
import argparse
from datetime import datetime

def extract_therapist_answers(file_path, output_path=None):
    """
    Extract therapist answers from the supervisor_content.txt file.
    
    Parameters:
    - file_path: Path to the supervisor_content.txt file
    - output_path: Path to write the extracted therapist answers (defaults to therapist_answers.txt)
    """
    if output_path is None:
        # Default output to same directory as input
        dir_path = os.path.dirname(file_path)
        output_path = os.path.join(dir_path, "therapist_answers.txt")
    
    # Read the supervisor_content.txt file
    try:
        with open(file_path, "r") as f:
            content = f.read()
    except:
        print(f"Error: Could not read file {file_path}")
        return False
    
    # Extract therapist answers
    pattern = r"<therapist_answer id=\"(.*?)\" entry=\"(.*?)\">\n(.*?)\n</therapist_answer>"
    matches = re.finditer(pattern, content, re.DOTALL)
    
    # Write extracted answers to the output file
    with open(output_path, "w") as f:
        f.write(f"# Extracted Therapist Answers - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        count = 0
        for match in matches:
            therapist_id = match.group(1)
            entry_num = match.group(2)
            therapist_text = match.group(3).strip()
            
            f.write(f"## Therapist Answer {count+1}\n")
            f.write(f"ID: {therapist_id}, Entry: {entry_num}\n\n")
            f.write(f"{therapist_text}\n\n")
            f.write("-" * 80 + "\n\n")
            
            count += 1
        
        f.write(f"\n# Total Therapist Answers: {count}\n")
    
    print(f"Extracted {count} therapist answers to {output_path}")
    return True

def extract_supervisor_feedback(file_path, output_path=None):
    """
    Extract supervisor feedback from the supervisor_content.txt file.
    
    Parameters:
    - file_path: Path to the supervisor_content.txt file
    - output_path: Path to write the extracted supervisor feedback (defaults to supervisor_feedback.txt)
    """
    if output_path is None:
        # Default output to same directory as input
        dir_path = os.path.dirname(file_path)
        output_path = os.path.join(dir_path, "supervisor_feedback.txt")
    
    # Read the supervisor_content.txt file
    try:
        with open(file_path, "r") as f:
            content = f.read()
    except:
        print(f"Error: Could not read file {file_path}")
        return False
    
    # Extract supervisor feedback
    pattern = r"<supervisor id=\"(.*?)\" entry=\"(.*?)\">\n(.*?)\n</supervisor>"
    matches = re.finditer(pattern, content, re.DOTALL)
    
    # Write extracted feedback to the output file
    with open(output_path, "w") as f:
        f.write(f"# Extracted Supervisor Feedback - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        count = 0
        for match in matches:
            supervisor_id = match.group(1)
            entry_num = match.group(2)
            supervisor_text = match.group(3).strip()
            
            f.write(f"## Supervisor Feedback {count+1}\n")
            f.write(f"ID: {supervisor_id}, Entry: {entry_num}\n\n")
            f.write(f"{supervisor_text}\n\n")
            f.write("-" * 80 + "\n\n")
            
            count += 1
        
        f.write(f"\n# Total Supervisor Feedback: {count}\n")
    
    print(f"Extracted {count} supervisor feedback to {output_path}")
    return True

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Extract therapist answers and supervisor feedback from the supervisor_content.txt file")
    parser.add_argument("--file", "-f", default="supervisor_content.txt", help="Path to the supervisor_content.txt file")
    parser.add_argument("--therapist-output", "-t", help="Path to write the extracted therapist answers")
    parser.add_argument("--supervisor-output", "-s", help="Path to write the extracted supervisor feedback")
    args = parser.parse_args()
    
    # Get the absolute path to the supervisor_content.txt file
    file_path = os.path.abspath(args.file)
    
    # Extract therapist answers
    extract_therapist_answers(file_path, args.therapist_output)
    
    # Extract supervisor feedback
    extract_supervisor_feedback(file_path, args.supervisor_output)

if __name__ == "__main__":
    main() 