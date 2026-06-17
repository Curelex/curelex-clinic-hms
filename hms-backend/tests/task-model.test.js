import { expect } from 'chai';
import Task from '../models/Task.js';

describe('Task Model', () => {
  const schema = Task.schema;

  it('should have required fields defined', () => {
    ['title', 'description', 'deadline', 'createdBy', 'clinicId'].forEach(field => {
      const path = schema.path(field);
      if (field === 'title' || field === 'description' || field === 'deadline' || field === 'createdBy' || field === 'clinicId') {
        expect(path).to.exist;
      }
    });
  });

  it('should have valid enum values for priority', () => {
    const priorityPath = schema.path('priority');
    const expected = ['Low', 'Medium', 'High', 'Urgent'];
    expected.forEach(v => expect(priorityPath.enumValues).to.include(v));
  });

  it('should have valid enum values for status', () => {
    const statusPath = schema.path('status');
    const expected = ['Received', 'In Process', 'Completed'];
    expected.forEach(v => expect(statusPath.enumValues).to.include(v));
  });

  it('should support recurrence field with correct enums', () => {
    const recurrencePath = schema.path('recurrence');
    const expected = ['none', 'daily', 'weekly', 'monthly'];
    expected.forEach(v => expect(recurrencePath.enumValues).to.include(v));
  });

  it('should default recurrence to none', () => {
    const recurrencePath = schema.path('recurrence');
    expect(recurrencePath.defaultValue).to.equal('none');
  });

  it('should have SLA-related fields', () => {
    expect(schema.path('slaHours')).to.exist;
    expect(schema.path('slaBreached')).to.exist;
    expect(schema.path('slaBreachedAt')).to.exist;
  });

  it('should have ongoing/recurrence fields', () => {
    expect(schema.path('isOngoing')).to.exist;
    expect(schema.path('parentTaskId')).to.exist;
    expect(schema.path('lastGenerated')).to.exist;
  });

  it('should have timestamps enabled', () => {
    expect(schema.options.timestamps).to.be.true;
  });

  it('should default slaHours to 0', () => {
    expect(schema.path('slaHours').defaultValue).to.equal(0);
  });

  it('should default isOngoing to false', () => {
    expect(schema.path('isOngoing').defaultValue).to.equal(false);
  });

  it('should default slaBreached to false', () => {
    expect(schema.path('slaBreached').defaultValue).to.equal(false);
  });
});
